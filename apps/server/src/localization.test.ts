import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 32).toString('base64');

describe('@metalayer/server localization', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('reads and updates localization preferences independently', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'locale-edit-credential',
        config: createDefaultMetaLayerConfig({ name: 'Locale' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'locale-edit-credential' };

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/localization`,
      headers,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().localization.interfaceLocale).toBe('en-US');
    expect(get.json().localization.contentRegion).toBe('US');

    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/localization`,
      headers,
      payload: {
        localization: {
          interfaceLocale: 'pt-BR',
          metadataLocale: 'pt-BR',
          metadataFallbackLocales: ['en-US', 'es-ES'],
          titleMode: 'localized-with-original',
          descriptionMode: 'best-available',
          contentRegion: 'BR',
          availabilityRegion: 'BR',
          certificationRegion: 'BR',
          releaseRegion: 'BR',
          timezone: 'America/Sao_Paulo',
        },
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().localization.interfaceLocale).toBe('pt-BR');
    expect(put.json().localization.contentRegion).toBe('BR');
    expect(put.json().localization.timezone).toBe('America/Sao_Paulo');

    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/localization`,
      headers,
      payload: {
        localization: {
          interfaceLocale: 'pt-BR',
          metadataLocale: 'pt-BR',
          contentRegion: 'BRA',
        },
      },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().code).toBe('VALIDATION_FAILED');
  });
});
