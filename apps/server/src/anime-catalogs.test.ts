import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

describe('@metalayer/server anime catalogs', () => {
  const store = createMemoryConfigurationStore(Buffer.alloc(32, 35).toString('base64'));
  const appPromise = buildApp({
    logger: false,
    store,
    providerFetch: async (_url, init) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      expect(body).toContain('MediaSort');
      return new Response(
        JSON.stringify({
          data: {
            Page: {
              media: [
                {
                  id: 5114,
                  idMal: 5114,
                  title: { english: 'Fullmetal Alchemist: Brotherhood', romaji: 'Hagane' },
                  coverImage: { large: 'https://example.com/fma.jpg' },
                  format: 'TV',
                },
              ],
            },
          },
        }),
        { status: 200 },
      );
    },
  });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('previews AniList anime catalogs as first-class anime type', async () => {
    const app = await appPromise;
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
        editCredential: 'anime-catalog-edit',
        config: createDefaultMetaLayerConfig({
          name: 'Anime Catalogs',
          catalogs: [anime],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/catalogs/${anime.instanceId}/preview`,
      headers: { 'x-metalayer-edit-credential': 'anime-catalog-edit' },
      payload: {},
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().metas).toHaveLength(1);
    expect(preview.json().metas[0].type).toBe('anime');
    expect(preview.json().metas[0].id).toBe('anilist:5114');
    expect(preview.json().metas[0].provider).toBe('anilist');
  });
});
