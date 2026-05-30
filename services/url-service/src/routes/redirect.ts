import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUrlByCode, incrementClicks } from '../db/urls';
import { getCache, setCache } from '../services/cache';
import { publishVisitEvent } from '../services/queue';

export async function redirectRoutes(fastify: FastifyInstance) {
  fastify.get('/s/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };

    let longUrl = await getCache(code, request.log);
    let cacheHit = false;

    if (!longUrl) {
      request.log.info({ code }, 'Cache miss, querying DB');
      const url = await getUrlByCode(code);
      if (!url || url.deleted_at) {
        request.log.warn({ code }, 'URL not found');
        return reply.code(404).send({ error: 'URL not found' });
      }
      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        request.log.info({ code, expiresAt: url.expires_at }, 'URL expired');
        return reply.code(410).send({ error: 'URL expired' });
      }
      longUrl = url.long_url;
      await setCache(code, longUrl!, 86400, request.log);
    } else {
      cacheHit = true;
      request.log.info({ code }, 'Cache hit');
    }

    const targetUrl = longUrl!;

    await incrementClicks(code);
    request.log.info({ code, cacheHit }, 'Click incremented');

    try {
      await publishVisitEvent({
        short_code: code,
        visited_at: new Date().toISOString(),
        referrer: request.headers.referer || '',
        user_agent: request.headers['user-agent'] || '',
        ip: request.ip,
      });
      request.log.info({ code }, 'Visit event published to SQS');
    } catch (err) {
      request.log.warn({ err, code }, 'Failed to publish visit event');
    }

    request.log.info({ code, longUrl: targetUrl, cacheHit }, 'Redirecting');
    return reply.header('X-Cache', cacheHit ? 'HIT' : 'MISS').header('Cache-Control', 'public, max-age=3600').redirect(targetUrl, 302);
  });
}
