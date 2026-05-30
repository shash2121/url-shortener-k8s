import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getTotalClicks,
  getClicksByDay,
  getTopReferrers,
  getTopCountries,
  getTodayClicks,
} from '../db/visits';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/analytics/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };

    const totalClicks = await getTotalClicks(code);
    const todayClicks = await getTodayClicks(code);
    const clicksByDay = await getClicksByDay(code);
    const topReferrers = await getTopReferrers(code);
    const countries = await getTopCountries(code);

    request.log.info({ code, totalClicks, todayClicks }, 'Analytics queried');
    return reply.code(200).send({
      totalClicks,
      todayClicks,
      clicksByDay,
      topReferrers,
      countries,
    });
  });
}
