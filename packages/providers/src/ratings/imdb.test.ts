import { describe, expect, it } from 'vitest';
import { ImdbProviderAdapter } from './imdb.js';

const CINEMETA_FIXTURE = {
  meta: {
    imdb_id: 'tt12042730',
    name: 'Project Hail Mary',
    type: 'movie',
    cast: ['Ryan Gosling', 'Sandra Hüller'],
    description: 'A science teacher wakes up alone on a spaceship.',
    director: ['Phil Lord', 'Christopher Miller'],
    genre: ['Adventure', 'Comedy', 'Drama'],
    genres: ['Adventure', 'Comedy', 'Drama'],
    imdbRating: '8.2',
    released: '2026-03-20T00:00:00.000Z',
    writer: ['Drew Goddard', 'Andy Weir'],
    year: '2026',
    moviedb_id: 687163,
    poster: 'https://images.metahub.space/poster/small/tt12042730/img',
    background: 'https://images.metahub.space/background/medium/tt12042730/img',
    logo: 'https://images.metahub.space/logo/medium/tt12042730/img',
    runtime: '157 min',
    trailers: [{ source: 'NKYea63tQmI', type: 'Trailer' }],
    id: 'tt12042730',
  },
};

describe('@metalayer/providers imdb / cinemeta metadata', () => {
  it('parses full Cinemeta meta through getMeta', async () => {
    const urls: string[] = [];
    const adapter = new ImdbProviderAdapter({
      fetchImpl: async (url) => {
        urls.push(String(url));
        return new Response(JSON.stringify(CINEMETA_FIXTURE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    const meta = await adapter.getMeta(
      { correlationId: 'm1' },
      'tt12042730',
      'movie',
    );

    expect(meta.title).toBe('Project Hail Mary');
    expect(meta.description).toContain('spaceship');
    expect(meta.poster).toContain('poster');
    expect(meta.background).toContain('background');
    expect(meta.logo).toContain('logo');
    expect(meta.rating).toBe(8.2);
    expect(meta.runtimeMinutes).toBe(157);
    expect(meta.cast).toEqual(['Ryan Gosling', 'Sandra Hüller']);
    expect(meta.directors).toEqual(['Phil Lord', 'Christopher Miller']);
    expect(meta.writers).toEqual(['Drew Goddard', 'Andy Weir']);
    expect(meta.genres).toEqual(['Adventure', 'Comedy', 'Drama']);
    expect(meta.externalIds).toEqual({ imdb: 'tt12042730', tmdb: 687163 });
    expect(meta.source).toBe('cinemeta');
    expect(urls[0]).toContain('/meta/movie/tt12042730.json');
    expect(adapter.getHealth().state).toBe('healthy');
  });

  it('keeps getRating as a thin wrapper over getMeta', async () => {
    const adapter = new ImdbProviderAdapter({
      fetchImpl: async () =>
        new Response(JSON.stringify(CINEMETA_FIXTURE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    const rating = await adapter.getRating(
      { correlationId: 'r1' },
      'tt12042730',
      'movie',
    );

    expect(rating).toEqual({
      imdbId: 'tt12042730',
      mediaType: 'movie',
      rating: 8.2,
      ratingRaw: '8.2',
      source: 'cinemeta',
    });
  });

  it('rejects invalid IMDb ids', async () => {
    const adapter = new ImdbProviderAdapter({
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });
    await expect(
      adapter.getMeta({ correlationId: 'r2' }, 'not-an-id'),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('caches meta without embedding secrets', async () => {
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
    const adapter = new ImdbProviderAdapter({
      cache,
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify(CINEMETA_FIXTURE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await adapter.getMeta({ correlationId: 'c' }, 'tt12042730');
    await adapter.getMeta({ correlationId: 'c' }, 'tt12042730');
    expect(calls).toBe(1);
    expect(adapter.lastCacheStatus).toBe('hit');
    expect([...store.keys()][0]).toContain('tt12042730');
    expect([...store.keys()][0]).toContain('meta');
  });
});
