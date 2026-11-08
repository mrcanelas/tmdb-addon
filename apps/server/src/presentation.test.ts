import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 33).toString('base64');

describe('@metalayer/server presentation', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('reads and updates presentation preferences and prefixes the manifest', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'presentation-edit-credential',
        config: createDefaultMetaLayerConfig({
          name: 'Presentation',
          catalogs: [
            {
              instanceId: 'cat_1',
              provider: 'tmdb',
              providerCatalogId: 'popular',
              mediaType: 'movie',
              originalName: 'Popular Movies',
              enabled: true,
              showInHome: true,
              position: 0,
              tags: [],
            },
          ],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = {
      'x-metalayer-edit-credential': 'presentation-edit-credential',
    };

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/presentation`,
      headers,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().presentation.catalogNamePrefix).toBe(false);

    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/presentation`,
      headers,
      payload: {
        presentation: {
          castCount: 10,
          catalogNamePrefix: true,
          showAgeRatingInGenres: true,
          hideEpisodeSpoilers: true,
          ratingPostersForLibrary: false,
        },
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().presentation.castCount).toBe(10);
    expect(put.json().presentation.catalogNamePrefix).toBe(true);
    expect(put.json().presentation.hideEpisodeSpoilers).toBe(true);

    const manifest = await app.inject({
      method: 'GET',
      url: `/c/${configId}/manifest.json`,
    });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.json().catalogs[0].name).toBe('MetaLayer - Popular Movies');

    const languages = await app.inject({
      method: 'GET',
      url: '/api/v1/languages',
    });
    expect(languages.statusCode).toBe(200);
    expect(languages.json().languages.length).toBeGreaterThan(10);
    expect(languages.json().languages[0]).toEqual(
      expect.objectContaining({ value: expect.any(String), name: expect.any(String) }),
    );
  });
});
