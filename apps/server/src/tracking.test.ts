import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 37).toString('base64');

describe('@metalayer/server tracking', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('reports tracking status and applies hideWatched without breaking on failure', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'tracking-edit',
        secrets: { trakt: 'trakt-access-token' },
        config: createDefaultMetaLayerConfig({
          name: 'Tracking',
          globalRules: { hideWatched: true },
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'tracking-edit' };

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/tracking/status`,
      headers,
    });
    expect(status.statusCode).toBe(200);
    const trakt = status
      .json()
      .providers.find((item: { provider: string }) => item.provider === 'trakt');
    expect(trakt.state).toBe('connected');
    expect(trakt.adapterAvailable).toBe(true);

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/preview-hide-watched`,
      headers,
      payload: {
        hideWatched: true,
        items: [
          { id: 'tt0137523', title: 'Fight Club' },
          { id: 'tt0111161', title: 'Shawshank' },
        ],
        fixtures: [
          {
            provider: 'trakt',
            mediaType: 'movie',
            status: 'completed',
            externalIds: { imdb: 'tt0137523' },
          },
        ],
      },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().ok).toBe(true);
    expect(preview.json().excluded).toEqual(['tt0137523']);
    expect(preview.json().included).toEqual(['tt0111161']);
    expect(preview.json().degraded).toBe(false);

    const failed = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/preview-hide-watched`,
      headers,
      payload: {
        hideWatched: true,
        failTracking: true,
        items: [
          { id: 'tt0137523', title: 'Fight Club' },
          { id: 'tt0111161', title: 'Shawshank' },
        ],
      },
    });
    expect(failed.statusCode).toBe(200);
    expect(failed.json().ok).toBe(true);
    expect(failed.json().degraded).toBe(true);
    // Without watch annotations, hideWatched cannot exclude — metadata path stays up.
    expect(failed.json().included.sort()).toEqual(['tt0111161', 'tt0137523']);
    expect(failed.json().failure?.code).toBe('upstream');
  });

  it('stores oauth access/refresh kinds without exposing plaintext', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'oauth-edit',
        config: createDefaultMetaLayerConfig({ name: 'OAuth' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'oauth-edit' };

    const lookup = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/tracking/lookup`,
      headers,
      payload: {
        provider: 'trakt',
        accessToken: 'access-secret-value',
        refreshToken: 'refresh-secret-value',
        fixtures: [],
      },
    });
    expect(lookup.statusCode).toBe(200);
    expect(JSON.stringify(lookup.json())).not.toContain('access-secret-value');
    expect(JSON.stringify(lookup.json())).not.toContain('refresh-secret-value');
    expect(lookup.json().connectionState).toBe('connected');
  });
});
