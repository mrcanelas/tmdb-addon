import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 33).toString('base64');

describe('@metalayer/server native Stremio routes', () => {
  afterAll(async () => {
    // closed per-test apps
  });

  it('serves catalog metas and empty catalog contract', async () => {
    const store = createMemoryConfigurationStore(TEST_KEY);
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url) => {
        expect(String(url)).toContain('/trending/movie/week');
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 550,
                title: 'Fight Club',
                poster_path: '/p.jpg',
                release_date: '1999-10-15',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const movie = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending Movies',
      position: 0,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'native-stremio-credential',
        secrets: { tmdb: 'test-tmdb-key' },
        config: createDefaultMetaLayerConfig({
          name: 'Native',
          catalogs: [movie],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const catalog = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/movie/tmdb.trending.json`,
    });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().metas).toHaveLength(1);
    expect(catalog.json().metas[0]).toEqual(
      expect.objectContaining({
        type: 'movie',
        name: 'Fight Club',
      }),
    );

    const empty = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/movie/tmdb.missing.json`,
    });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ metas: [] });

    await app.close();
  });

  it('serves movie meta for a native configuration', async () => {
    const store = createMemoryConfigurationStore(Buffer.alloc(32, 34).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (input) => {
        const url = String(input);
        if (url.includes('/find/')) {
          return new Response(
            JSON.stringify({ movie_results: [{ id: 550 }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/movie/550')) {
          return new Response(
            JSON.stringify({
              id: 550,
              title: 'Fight Club',
              overview: 'An insomniac…',
              release_date: '1999-10-15',
              poster_path: '/p.jpg',
              backdrop_path: '/b.jpg',
              vote_average: 8.4,
              imdb_id: 'tt0137523',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'native-meta-credential',
        secrets: { tmdb: 'test-tmdb-key' },
        config: createDefaultMetaLayerConfig({ name: 'Meta' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const meta = await app.inject({
      method: 'GET',
      url: `/c/${configId}/meta/movie/tt0137523.json`,
    });
    expect(meta.statusCode).toBe(200);
    expect(meta.json().meta).toEqual(
      expect.objectContaining({
        type: 'movie',
        name: 'Fight Club',
        id: 'tt0137523',
      }),
    );

    await app.close();
  });

  it('serves series and anime meta for a native configuration', async () => {
    const store = createMemoryConfigurationStore(Buffer.alloc(32, 35).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (input, init) => {
        const url = String(input);
        if (url.includes('/find/')) {
          return new Response(
            JSON.stringify({ tv_results: [{ id: 1396 }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/tv/1396')) {
          return new Response(
            JSON.stringify({
              id: 1396,
              name: 'Breaking Bad',
              overview: 'A chemistry teacher…',
              first_air_date: '2008-01-20',
              poster_path: '/bb.jpg',
              backdrop_path: '/bbb.jpg',
              vote_average: 8.9,
              external_ids: { imdb_id: 'tt0903747' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('anilist') || url.includes('graphql')) {
          const body = typeof init?.body === 'string' ? init.body : '';
          expect(body).toContain('Media');
          return new Response(
            JSON.stringify({
              data: {
                Media: {
                  id: 5114,
                  title: {
                    romaji: 'Hagane no Renkinjutsushi',
                    english: 'Fullmetal Alchemist: Brotherhood',
                  },
                  description: 'Alchemy…',
                  format: 'TV',
                  averageScore: 90,
                  coverImage: { large: 'https://example.com/fma.jpg' },
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'native-series-credential',
        secrets: { tmdb: 'test-tmdb-key' },
        config: createDefaultMetaLayerConfig({ name: 'SeriesMeta' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const series = await app.inject({
      method: 'GET',
      url: `/c/${configId}/meta/series/tt0903747.json`,
    });
    expect(series.statusCode).toBe(200);
    expect(series.json().meta).toEqual(
      expect.objectContaining({
        type: 'series',
        name: 'Breaking Bad',
        id: 'tt0903747',
      }),
    );

    const anime = await app.inject({
      method: 'GET',
      url: `/c/${configId}/meta/anime/anilist:5114.json`,
    });
    expect(anime.statusCode).toBe(200);
    expect(anime.json().meta).toEqual(
      expect.objectContaining({
        type: 'series',
        name: 'Fullmetal Alchemist: Brotherhood',
        id: 'anilist:5114',
      }),
    );

    await app.close();
  });
});
