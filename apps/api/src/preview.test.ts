import { afterAll, describe, expect, it } from 'vitest';
import { MemoryCache } from '@metalayer/cache';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 21).toString('base64');

describe('@metalayer/api preview cache', () => {
  const cache = new MemoryCache();
  let calls = 0;
  const appPromise = buildApp({
    logger: false,
    encryptionKey: TEST_KEY,
    sqlitePath: ':memory:',
    providerCache: cache,
    providerFetch: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          id: 550,
          title: 'Clube da Luta',
          original_title: 'Fight Club',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('caches TMDB movie previews by locale', async () => {
    const app = await appPromise;
    const first = await app.inject({
      method: 'GET',
      url: '/api/v1/preview/movie/550?locale=pt-BR&region=BR&apiKey=preview-key',
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().cacheStatus).toBe('miss');
    expect(JSON.stringify(first.json())).not.toContain('preview-key');

    const second = await app.inject({
      method: 'GET',
      url: '/api/v1/preview/movie/550?locale=pt-BR&region=BR&apiKey=preview-key',
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().cacheStatus).toBe('hit');
    expect(calls).toBe(1);

    const stats = await app.inject({ method: 'GET', url: '/api/v1/cache/stats' });
    expect(stats.json().cache.hits).toBeGreaterThanOrEqual(1);
  });
});
