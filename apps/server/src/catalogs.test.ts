import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 27).toString('base64');

describe('@metalayer/server catalog studio', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('lists catalogs in studio order and keeps manifest order in sync after moves', async () => {
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
        editCredential: 'catalog-edit-credential',
        config: createDefaultMetaLayerConfig({
          name: 'Catalogs',
          catalogs: [movie, series],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'catalog-edit-credential' };

    const listed = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/catalogs`,
      headers,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().manifestOrder.map((item: { type: string }) => item.type)).toEqual([
      'movie',
      'series',
    ]);

    const moved = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalogs/${series.instanceId}`,
      headers,
      payload: { action: 'move', toIndex: 0 },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().manifestOrder.map((item: { type: string }) => item.type)).toEqual([
      'series',
      'movie',
    ]);
    expect(moved.json().catalogs.map((item: { position: number }) => item.position)).toEqual([
      0, 1,
    ]);
  });

  it('creates merged catalogs, exports definitions, and previews TMDB results', async () => {
    const store = createMemoryConfigurationStore(Buffer.alloc(32, 28).toString('base64'));
    const app = await buildApp({
      logger: false,
      store,
      providerFetch: async (url) => {
        expect(url).toContain('/trending/movie/week');
        return new Response(
          JSON.stringify({
            results: [
              { id: 1, title: 'One', poster_path: '/a.jpg', release_date: '2024-01-01' },
              { id: 2, title: 'Two', poster_path: '/b.jpg', release_date: '2024-02-01' },
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
    const series = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'popular',
      mediaType: 'movie',
      originalName: 'Popular Movies',
      position: 1,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'catalog-edit-credential',
        secrets: { tmdb: 'preview-key' },
        config: createDefaultMetaLayerConfig({
          name: 'Catalogs',
          catalogs: [movie, series],
        }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'catalog-edit-credential' };

    const merged = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalogs`,
      headers,
      payload: {
        action: 'createMerged',
        name: 'Mix',
        mediaType: 'movie',
        mergeMode: 'dedupe-union',
        sourceInstanceIds: [movie.instanceId, series.instanceId],
      },
    });
    expect(merged.statusCode).toBe(200);
    expect(merged.json().catalogs.some((item: { merge?: unknown }) => item.merge)).toBe(true);

    const exported = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/catalogs/export`,
      headers,
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().catalogs.length).toBeGreaterThanOrEqual(3);

    const tagged = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalogs/${movie.instanceId}`,
      headers,
      payload: { action: 'setTags', tags: ['featured'] },
    });
    expect(tagged.statusCode).toBe(200);
    expect(
      tagged.json().catalogs.find((item: { instanceId: string }) => item.instanceId === movie.instanceId)
        .tags,
    ).toEqual(['featured']);

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalogs/${movie.instanceId}/preview`,
      headers,
      payload: {},
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().metas).toHaveLength(2);
    expect(preview.json().metas[0].name).toBe('One');

    const manifest = await app.inject({
      method: 'GET',
      url: `/c/${configId}/manifest.json`,
    });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.json().catalogs.length).toBeGreaterThan(0);

    await app.close();
  });
});
