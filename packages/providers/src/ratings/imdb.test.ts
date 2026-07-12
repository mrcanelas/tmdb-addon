import { describe, expect, it } from 'vitest';
import { ImdbRatingsAdapter } from './imdb.js';

describe('@metalayer/providers imdb ratings', () => {
  it('fetches IMDb ratings through Cinemeta with injectable HTTP', async () => {
    const urls: string[] = [];
    const adapter = new ImdbRatingsAdapter({
      fetchImpl: async (url) => {
        urls.push(String(url));
        return new Response(
          JSON.stringify({ meta: { imdbRating: '8.8', id: 'tt0137523' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const rating = await adapter.getRating(
      { correlationId: 'r1' },
      'tt0137523',
      'movie',
    );

    expect(rating).toEqual({
      imdbId: 'tt0137523',
      mediaType: 'movie',
      rating: 8.8,
      ratingRaw: '8.8',
      source: 'cinemeta',
    });
    expect(urls[0]).toContain('/meta/movie/tt0137523.json');
    expect(adapter.getHealth().state).toBe('healthy');
  });

  it('rejects invalid IMDb ids', async () => {
    const adapter = new ImdbRatingsAdapter({
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });
    await expect(
      adapter.getRating({ correlationId: 'r2' }, 'not-an-id'),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('caches ratings without embedding secrets', async () => {
    const store = new Map<string, { value: unknown }>();
    const cache = {
      async get<T>(key: string) {
        const entry = store.get(key);
        if (!entry) return null;
        return { status: 'hit' as const, entry: { value: entry.value as T } };
      },
      async set<T>(key: string, value: T) {
        store.set(key, { value });
      },
    };
    let calls = 0;
    const adapter = new ImdbRatingsAdapter({
      cache,
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({ meta: { imdbRating: '9.0' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await adapter.getRating({ correlationId: 'c' }, 'tt0111161');
    await adapter.getRating({ correlationId: 'c' }, 'tt0111161');
    expect(calls).toBe(1);
    expect(adapter.lastCacheStatus).toBe('hit');
    expect([...store.keys()][0]).toContain('tt0111161');
  });
});
