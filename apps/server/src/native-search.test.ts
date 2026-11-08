import { describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';
import { parseCatalogExtra } from './stremio/catalog-meta.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('native Stremio text search', () => {
  it('parses skip, search and genre from the extra segment', () => {
    expect(parseCatalogExtra(undefined)).toEqual({ skip: 0 });
    expect(parseCatalogExtra('skip=40')).toEqual({ skip: 40 });
    expect(parseCatalogExtra('search=fight%20club&skip=20')).toEqual({
      skip: 20,
      search: 'fight club',
    });
    expect(parseCatalogExtra('genre=Drama&search=a+b')).toEqual({
      skip: 0,
      search: 'a b',
      genre: 'Drama',
    });
    expect(parseCatalogExtra('skip=-3&search=%20')).toEqual({ skip: 0 });
  });

  it('advertises search catalogs and serves TMDB results with search-only rules', async () => {
    const seen: string[] = [];
    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(Buffer.alloc(32, 51).toString('base64')),
      providerFetch: async (input) => {
        const url = String(input);
        seen.push(url);
        if (url.includes('/search/movie')) {
          expect(url).toContain('query=fight');
          return json({
            total_pages: 1,
            results: [
              { id: 550, title: 'Fight Club', poster_path: '/p.jpg', release_date: '1999-10-15', vote_average: 8.4, genre_ids: [18] },
              { id: 999, title: 'Fight Night', poster_path: '/q.jpg', release_date: '2010-01-01', vote_average: 4.1, genre_ids: [28] },
            ],
          });
        }
        return json({ results: [] });
      },
    });

    const movie = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending Movies',
      position: 0,
      // Catalog rules must not leak into search (AGENTS.md §13.8).
      rules: { minimumRating: 9 },
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'search-credential',
        secrets: { tmdb: 'test-tmdb-key' },
        config: createDefaultMetaLayerConfig({
          name: 'Search',
          catalogs: [movie],
          globalRules: { minimumRating: 9 },
          search: { enabled: true, rules: { minimumRating: 5 } },
          localization: {
            interfaceLocale: 'pt-BR',
            metadataLocale: 'pt-BR',
            metadataFallbackLocales: [],
            titleMode: 'localized',
            descriptionMode: 'localized',
            contentRegion: 'BR',
            timezone: 'UTC',
          },
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const manifest = await app.inject({ method: 'GET', url: `/c/${configId}/manifest.json` });
    expect(manifest.statusCode).toBe(200);
    const searchCatalogs = manifest.json().catalogs.filter(
      (catalog: { id: string }) => catalog.id === 'metalayer.search',
    );
    expect(searchCatalogs.map((catalog: { type: string }) => catalog.type)).toEqual(['movie', 'series']);
    expect(searchCatalogs[0].name).toBe('Buscar filmes');
    expect(searchCatalogs[0].extra).toEqual(
      expect.arrayContaining([{ name: 'search', isRequired: true }]),
    );
    expect(searchCatalogs[0].extraSupported).toContain('search');

    const results = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/movie/metalayer.search/search=fight.json`,
    });
    expect(results.statusCode).toBe(200);
    // Global/catalog minimumRating 9 is ignored; search minimumRating 5 drops "Fight Night".
    expect(results.json().metas.map((meta: { name: string }) => meta.name)).toEqual(['Fight Club']);

    const noQuery = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/movie/metalayer.search.json`,
    });
    expect(noQuery.json()).toEqual({ metas: [] });

    const disabledType = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/anime/metalayer.search/search=naruto.json`,
    });
    expect(disabledType.json()).toEqual({ metas: [] });
    expect(seen.some((url) => url.includes('graphql'))).toBe(false);

    await app.close();
  });

  it('hides search catalogs when disabled and reports missing credentials', async () => {
    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(Buffer.alloc(32, 52).toString('base64')),
      providerFetch: async () => json({ results: [] }),
    });

    const disabled = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'search-off',
        config: createDefaultMetaLayerConfig({ name: 'Off', search: { enabled: false } }),
      },
    });
    const offId = disabled.json().configId;
    const offManifest = await app.inject({ method: 'GET', url: `/c/${offId}/manifest.json` });
    expect(
      offManifest.json().catalogs.some((catalog: { id: string }) => catalog.id === 'metalayer.search'),
    ).toBe(false);

    const noKey = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'search-nokey',
        config: createDefaultMetaLayerConfig({ name: 'No key' }),
      },
    });
    const noKeyId = noKey.json().configId;
    const results = await app.inject({
      method: 'GET',
      url: `/c/${noKeyId}/catalog/series/metalayer.search/search=lost.json`,
    });
    expect(results.statusCode).toBe(200);
    expect(results.json().metas).toEqual([]);
    expect(results.json().warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SOURCE_CREDENTIAL_MISSING' }),
      ]),
    );

    await app.close();
  });

  it('searches anime through the configured anime provider', async () => {
    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(Buffer.alloc(32, 53).toString('base64')),
      providerFetch: async (input, init) => {
        const url = String(input);
        if (url.includes('graphql.anilist.co')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { variables?: { search?: string } };
          expect(body.variables?.search).toBe('cowboy');
          return json({
            data: {
              Page: {
                media: [
                  { id: 1, idMal: 1, title: { romaji: 'Cowboy Bebop', english: 'Cowboy Bebop' }, coverImage: { large: 'https://img/cb.jpg' }, format: 'TV' },
                ],
              },
            },
          });
        }
        return json({ results: [] });
      },
    });

    const anime = createCatalogInstance({
      provider: 'anilist',
      providerCatalogId: 'trending',
      mediaType: 'anime',
      originalName: 'Trending Anime',
      position: 0,
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'anime-search',
        config: createDefaultMetaLayerConfig({ name: 'Anime', catalogs: [anime] }),
      },
    });
    const { configId } = created.json();

    const manifest = await app.inject({ method: 'GET', url: `/c/${configId}/manifest.json` });
    expect(
      manifest.json().catalogs.some(
        (catalog: { id: string; type: string }) => catalog.id === 'metalayer.search' && catalog.type === 'anime',
      ),
    ).toBe(true);

    const results = await app.inject({
      method: 'GET',
      url: `/c/${configId}/catalog/anime/metalayer.search/search=cowboy.json`,
    });
    expect(results.statusCode).toBe(200);
    expect(results.json().metas).toEqual([
      expect.objectContaining({ id: 'anilist:1', type: 'series', name: 'Cowboy Bebop' }),
    ]);

    await app.close();
  });
});
