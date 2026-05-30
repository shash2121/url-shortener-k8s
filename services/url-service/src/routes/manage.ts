import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUserUrls, deleteUrl } from '../db/urls';
import { invalidateCache } from '../services/cache';

const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  try {
    const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/verify`, {
      headers: { Authorization: authHeader },
    }).catch(() => null);
    if (!authResponse || !authResponse.ok) return reply.code(401).send({ error: 'Invalid token' });
    const payload = await authResponse.json();
    (request as any).user = payload;
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};

export async function manageRoutes(fastify: FastifyInstance) {
  fastify.get('/urls', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.sub;
    const urls = await getUserUrls(userId);
    request.log.info({ userId, count: urls.length }, 'URLs listed');
    return reply.code(200).send(urls);
  });

  fastify.delete('/urls/:code', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const userId = (request as any).user.sub;
    const deleted = await deleteUrl(code, userId);
    if (!deleted) {
      request.log.warn({ code, userId }, 'URL not found for deletion');
      return reply.code(404).send({ error: 'URL not found' });
    }
    await invalidateCache(code, request.log);
    return reply.code(204).send();
  });
}
