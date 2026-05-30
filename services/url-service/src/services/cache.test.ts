import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  })),
}));

describe('Cache-aside Lookup', () => {
  let getCache: any, setCache: any, invalidateCache: any;
  let Redis: any;

  beforeEach(async () => {
    vi.resetModules();
    Redis = (await import('ioredis')).default;
    const cache = await import('./cache');
    getCache = cache.getCache;
    setCache = cache.setCache;
    invalidateCache = cache.invalidateCache;
  });

  it('returns null on cache miss', async () => {
    const mockRedis = new Redis();
    (mockRedis.get as any).mockResolvedValue(null);
    const result = await getCache('abc123');
    expect(result).toBeNull();
  });

  it('returns value on cache hit', async () => {
    const mockRedis = new Redis();
    (mockRedis.get as any).mockResolvedValue('https://example.com');
    const result = await getCache('abc123');
    expect(result).toBe('https://example.com');
  });

  it('sets value with TTL', async () => {
    const mockRedis = new Redis();
    await setCache('abc123', 'https://example.com', 86400);
    expect(mockRedis.setex).toHaveBeenCalledWith('url:abc123', 86400, 'https://example.com');
  });

  it('invalidates cache entry', async () => {
    const mockRedis = new Redis();
    await invalidateCache('abc123');
    expect(mockRedis.del).toHaveBeenCalledWith('url:abc123');
  });
});
