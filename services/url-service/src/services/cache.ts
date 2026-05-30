import Redis from 'ioredis';
import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL || 'info', name: 'url-service' });

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    redis.on('connect', () => log.info({ component: 'cache' }, 'Redis connected'));
    redis.on('error', (err) => log.error({ err, component: 'cache' }, 'Redis error'));
  }
  return redis;
}

export async function getCache(key: string, logger?: any): Promise<string | null> {
  const value = await getRedis().get(`url:${key}`);
  (logger || log).info({ key, hit: !!value, service: 'url-service', component: 'cache' }, value ? 'Cache hit' : 'Cache miss');
  return value;
}

export async function setCache(key: string, value: string, ttl: number, logger?: any): Promise<void> {
  await getRedis().setex(`url:${key}`, ttl, value);
  (logger || log).info({ key, ttl, service: 'url-service', component: 'cache' }, 'Cache set');
}

export async function invalidateCache(key: string, logger?: any): Promise<void> {
  await getRedis().del(`url:${key}`);
  (logger || log).info({ key, service: 'url-service', component: 'cache' }, 'Cache invalidated');
}
