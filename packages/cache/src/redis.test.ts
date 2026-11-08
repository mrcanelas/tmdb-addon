import { afterEach, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { RedisCache } from './redis.js';

const redisUrl = process.env.REDIS_URL;

describe.runIf(Boolean(redisUrl))('@metalayer/cache redis', () => {
  let cache: RedisCache | undefined;

  afterEach(async () => {
    if (cache) {
      await cache.clear();
      await cache.close();
      cache = undefined;
    }
  });

  it('stores and retrieves locale-sensitive entries', async () => {
    cache = new RedisCache({
      url: redisUrl!,
      keyPrefix: 'metalayer:test:cache:',
    });

    await cache.set('movie:550:pt-BR', { title: 'Clube da Luta' }, {
      ttlMs: 60_000,
      source: 'tmdb',
      staleEligible: true,
    });

    const hit = await cache.get<{ title: string }>('movie:550:pt-BR');
    expect(hit?.status).toBe('hit');
    expect(hit?.entry.value.title).toBe('Clube da Luta');
    expect(cache.stats().hits).toBe(1);
  });

  it('pings redis', async () => {
    const client = new Redis(redisUrl!);
    try {
      const pingCache = new RedisCache({ url: redisUrl!, client });
      expect(await pingCache.ping()).toBe(true);
    } finally {
      await client.quit();
    }
  });
});
