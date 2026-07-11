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
    providerFetch: async (url) => {
      calls += 1;
      const value = String(url);
      if (value.includes('/find/tt0137523')) {
        return new Response(
          JSON.stringify({ movie_results: [{ id: 550 }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          id: 550,
          title: 'Clube da Luta',
          original_title: 'Fight Club',
          imdb_id: 'tt0137523',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('resolves IMDb public ids and caches TMDB movie previews by locale', async () => {
    const app = await appPromise;
    const byImdb = await app.inject({
      method: 'GET',
      url: '/api/v1/preview/movie/tt0137523?locale=pt-BR&region=BR&apiKey=preview-key',
    });
    expect(byImdb.statusCode).toBe(200);
    expect(byImdb.json().movie.publicId).toBe('tt0137523');
    expect(byImdb.json().movie.imdbId).toBe('tt0137523');
    expect(JSON.stringify(byImdb.json())).not.toContain('preview-key');

    const first = await app.inject({
      method: 'GET',
      url: '/api/v1/preview/movie/550?locale=pt-BR&region=BR&apiKey=preview-key',
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().movie.publicId).toBe('tt0137523');

    const second = await app.inject({
      method: 'GET',
      url: '/api/v1/preview/movie/550?locale=pt-BR&region=BR&apiKey=preview-key',
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().cacheStatus).toBe('hit');
    expect(calls).toBeGreaterThanOrEqual(2);

    const stats = await app.inject({ method: 'GET', url: '/api/v1/cache/stats' });
    expect(stats.json().cache.hits).toBeGreaterThanOrEqual(1);
  });
});
