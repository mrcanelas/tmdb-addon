import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 33).toString('base64');

describe('@metalayer/server identity preferences', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('reads and updates identity preferences independently', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'identity-edit-credential',
        config: createDefaultMetaLayerConfig({ name: 'Identity' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'identity-edit-credential' };

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/identity`,
      headers,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().identity.stremioPublicId).toBe('imdb');
    expect(get.json().featureFlags).toEqual({});

    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/identity`,
      headers,
      payload: {
        identity: { stremioPublicId: 'tmdb' },
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().identity.stremioPublicId).toBe('tmdb');

    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/identity`,
      headers,
      payload: {
        identity: { stremioPublicId: 'tvdb' },
      },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().code).toBe('VALIDATION_FAILED');
  });
});
