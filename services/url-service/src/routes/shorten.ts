import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createShortUrl } from '../db/urls';
import { encodeBase62 } from '../services/base62';
import { setCache } from '../services/cache';

export async function shortenRoutes(fastify: FastifyInstance) {
  fastify.post('/shorten', {
    preHandler: async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      try {
        const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/verify`, {
          headers: { Authorization: authHeader },
        }).catch(() => null);
        if (!authResponse || !authResponse.ok) {
          return reply.code(401).send({ error: 'Invalid token' });
        }
        const payload = await authResponse.json();
        (request as any).user = payload;
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { url, alias, expiresIn } = request.body as { url: string; alias?: string; expiresIn?: string };
    const userId = (request as any).user.sub;

    if (!url) return reply.code(400).send({ error: 'URL is required' });

    let shortCode = alias;
    if (!shortCode) {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      shortCode = encodeBase62(id);
    }

    let expiresAt: Date | null = null;
    if (expiresIn) {
      const ms = parseDuration(expiresIn);
      expiresAt = new Date(Date.now() + ms);
    }

    try {
      const result = await createShortUrl(shortCode, url, userId, expiresAt);
      request.log.info({ shortCode, userId, expiresAt: expiresAt?.toISOString() }, 'URL created');
      await setCache(shortCode, url, 86400, request.log);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
      return reply.code(201).send({
        shortUrl: `${baseUrl}/s/${result.short_code}`,
        code: result.short_code,
        expiresAt: result.expires_at,
      });
    } catch (err: any) {
      request.log.error({ err, shortCode, userId }, 'URL shortening failed');
      if (err.code === '23505') return reply.code(409).send({ error: 'Short code already exists' });
      throw err;
    }
  });
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(h|d|w|m)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'h': return value * 3600000;
    case 'd': return value * 86400000;
    case 'w': return value * 604800000;
    case 'm': return value * 2592000000;
    default: return 0;
  }
}
