import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 36).toString('base64');

describe('@metalayer/server profiles', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('updates profiles and serves a profile-scoped manifest', async () => {
    const app = await appPromise;
    const movie = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending Movies',
      position: 0,
    });
    const series = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'series',
      originalName: 'Popular Series',
      position: 1,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'profiles-edit-credential',
        config: createDefaultMetaLayerConfig({
          name: 'Family',
          catalogs: [movie, series],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'profiles-edit-credential' };

    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/profiles`,
      headers,
      payload: {
        profiles: [
          {
            profileId: 'kids',
            name: 'Kids',
            enabled: true,
            localization: {
              metadataLocale: 'pt-BR',
              contentRegion: 'BR',
            },
            catalogInstanceIds: [movie.instanceId],
          },
        ],
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().profiles).toHaveLength(1);

    const listed = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/profiles`,
      headers,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().profiles[0].profileId).toBe('kids');

    const base = await app.inject({
      method: 'GET',
      url: `/c/${configId}/manifest.json`,
    });
    expect(base.statusCode).toBe(200);
    expect(base.json().catalogs).toHaveLength(2);

    const profileManifest = await app.inject({
      method: 'GET',
      url: `/c/${configId}/p/kids/manifest.json`,
    });
    expect(profileManifest.statusCode).toBe(200);
    expect(profileManifest.json().catalogs).toHaveLength(1);
    expect(profileManifest.json().catalogs[0].type).toBe('movie');
    expect(profileManifest.json().description).toContain('Kids');

    const missing = await app.inject({
      method: 'GET',
      url: `/c/${configId}/p/missing/manifest.json`,
    });
    expect(missing.statusCode).toBe(404);
  });

  it('serves profile-scoped catalog and rejects catalogs outside the profile', async () => {
    const store = createMemoryConfigurationStore(Buffer.alloc(32, 37).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url) => {
        const href = String(url);
        if (href.includes('/trending/movie/week')) {
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
        }
        if (href.includes('/movie/550')) {
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

    const movie = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending Movies',
      position: 0,
    });
    const series = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'series',
      originalName: 'Popular Series',
      position: 1,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'profile-catalog-credential',
        secrets: { tmdb: 'test-tmdb-key' },
        config: createDefaultMetaLayerConfig({
          name: 'Family',
          catalogs: [movie, series],
          profiles: [
            {
              profileId: 'kids',
              name: 'Kids',
              enabled: true,
              localization: { metadataLocale: 'pt-BR', contentRegion: 'BR' },
              catalogInstanceIds: [movie.instanceId],
            },
          ],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const allowed = await app.inject({
      method: 'GET',
      url: `/c/${configId}/p/kids/catalog/movie/tmdb.trending.json`,
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().metas).toHaveLength(1);
    expect(allowed.json().metas[0].name).toBe('Fight Club');

    const filtered = await app.inject({
      method: 'GET',
      url: `/c/${configId}/p/kids/catalog/series/tmdb.popular.json`,
    });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json()).toEqual({ metas: [] });

    const meta = await app.inject({
      method: 'GET',
      url: `/c/${configId}/p/kids/meta/movie/tmdb:550.json`,
    });
    expect(meta.statusCode).toBe(200);
    expect(meta.json().meta).toEqual(
      expect.objectContaining({
        type: 'movie',
        name: expect.any(String),
      }),
    );

    await app.close();
  });
});
