import { describe, expect, it } from 'vitest';
import { TmdbProviderAdapter } from './adapter.js';

describe('@metalayer/providers tmdb adapter', () => {
  it('fetches TMDB movie details through an injectable HTTP client', async () => {
    const calls: string[] = [];
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        calls.push(url);
        expect(url).toContain('api_key=test-key');
        expect(url).toContain('language=pt-BR');
        expect(url).toContain('region=BR');
        return new Response(
          JSON.stringify({
            id: 550,
            title: 'Clube da Luta',
            original_title: 'Fight Club',
            overview: 'Um homem insone...',
            release_date: '1999-10-15',
            poster_path: '/poster.jpg',
            vote_average: 8.4,
            original_language: 'en',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const movie = await adapter.getMovie(
      { correlationId: 'corr-1', locale: 'pt-BR', region: 'BR' },
      550,
    );

    expect(movie).toMatchObject({
      id: 550,
      title: 'Clube da Luta',
      originalTitle: 'Fight Club',
      publicId: 'tmdb:550',
    });
    expect(adapter.getHealth().state).toBe('healthy');
    expect(calls).toHaveLength(1);
  });

  it('classifies missing TMDB credentials as non-retryable auth errors', async () => {
    const adapter = new TmdbProviderAdapter({
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });

    await expect(
      adapter.ping({ correlationId: 'corr-2' }),
    ).rejects.toMatchObject({ code: 'auth', retryable: false });
  });

  it('uses IMDb as the default public Stremio id when present', async () => {
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        if (String(url).includes('/find/')) {
          return new Response(JSON.stringify({ movie_results: [{ id: 550 }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            id: 550,
            title: 'Fight Club',
            imdb_id: 'tt0137523',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const movie = await adapter.getMovieByPublicId(
      { correlationId: 'imdb-1', locale: 'en-US' },
      'tt0137523',
    );
    expect(movie.publicId).toBe('tt0137523');
    expect(movie.id).toBe(550);
  });

  it('resolves series by IMDb public id via TMDB find + tv details', async () => {
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        if (String(url).includes('/find/')) {
          return new Response(JSON.stringify({ tv_results: [{ id: 1396 }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        expect(String(url)).toContain('/tv/1396');
        return new Response(
          JSON.stringify({
            id: 1396,
            name: 'Breaking Bad',
            original_name: 'Breaking Bad',
            overview: 'A chemistry teacher…',
            first_air_date: '2008-01-20',
            poster_path: '/bb.jpg',
            vote_average: 8.9,
            external_ids: { imdb_id: 'tt0903747' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const series = await adapter.getSeriesByPublicId(
      { correlationId: 'series-1', locale: 'en-US' },
      'tt0903747',
    );
    expect(series.publicId).toBe('tt0903747');
    expect(series.id).toBe(1396);
    expect(series.title).toBe('Breaking Bad');
    expect(series.firstAirDate).toBe('2008-01-20');
  });

  it('loads season episodes and skips season 0 specials', async () => {
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        const href = String(url);
        if (href.includes('/tv/1396/season/1')) {
          return new Response(
            JSON.stringify({
              season_number: 1,
              episodes: [
                {
                  episode_number: 1,
                  name: 'Pilot',
                  overview: 'Walter…',
                  air_date: '2008-01-20',
                  still_path: '/e1.jpg',
                },
                {
                  episode_number: 2,
                  name: 'Cat\'s in the Bag...',
                  air_date: '2008-01-27',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      },
    });

    const episodes = await adapter.getSeriesEpisodes(
      { correlationId: 'eps-1', locale: 'en-US' },
      {
        id: 1396,
        title: 'Breaking Bad',
        publicId: 'tt0903747',
        numberOfSeasons: 1,
        seasons: [
          { seasonNumber: 0, name: 'Specials' },
          { seasonNumber: 1, name: 'Season 1', episodeCount: 2 },
        ],
      },
    );
    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toMatchObject({
      seasonNumber: 1,
      episodeNumber: 1,
      name: 'Pilot',
    });
  });

  it('caches movie responses per locale without putting secrets in keys', async () => {
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
    const adapter = new TmdbProviderAdapter({
      apiKey: 'test-key',
      cache,
      fetchImpl: async () => {
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

    const ctx = { correlationId: 'c', locale: 'pt-BR', region: 'BR' };
    await adapter.getMovie(ctx, 550);
    expect(adapter.lastCacheStatus).toBe('miss');
    await adapter.getMovie(ctx, 550);
    expect(adapter.lastCacheStatus).toBe('hit');
    expect(calls).toBe(1);
    expect([...store.keys()][0]).not.toContain('test-key');
    expect([...store.keys()][0]).toContain('pt-BR');
  });
});
