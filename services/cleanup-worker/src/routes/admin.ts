import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { runCleanup } from '../jobs/expireUrls';
import { getCleanupRuns } from '../db/cleanup';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/admin/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info('Cleanup triggered manually');
    const result = await runCleanup();
    request.log.info({ ...result }, 'Manual cleanup completed');
    return reply.code(200).send(result);
  });

  fastify.get('/admin/runs', async (request: FastifyRequest, reply: FastifyReply) => {
    const runs = await getCleanupRuns();
    request.log.info({ count: runs.length }, 'Cleanup runs listed');
    return reply.code(200).send(runs);
  });
}
