import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 27).toString('base64');

describe('@metalayer/api catalog studio', () => {
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
});
