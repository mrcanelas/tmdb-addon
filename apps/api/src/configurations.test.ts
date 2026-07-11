import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createMemoryConfigurationStore } from '@metalayer/persistence';

const TEST_KEY = Buffer.alloc(32, 3).toString('base64');

describe('@metalayer/api configurations', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('creates a persistent configuration without secrets in the response or manifest path', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        name: 'Silas',
        editCredential: 'super-secret-edit',
        secrets: { tmdb: 'tmdb-secret-value' },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.configId).toMatch(/^ml_/);
    expect(body.manifestPath).toBe(`/c/${body.configId}/manifest.json`);
    expect(body.secrets).toEqual({ tmdb: 'connected' });
    expect(JSON.stringify(body)).not.toContain('tmdb-secret-value');
    expect(JSON.stringify(body)).not.toContain('super-secret-edit');
    expect(body.manifestPath).not.toContain('tmdb');
  });

  it('requires edit credential to read configuration and serves native manifest without secrets', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        name: 'Family',
        editCredential: 'family-edit-credential',
        secrets: { trakt: 'trakt-token' },
      },
    });
    const { configId, manifestPath } = created.json();

    const unauthorized = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}`,
    });
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}`,
      headers: { 'x-metalayer-edit-credential': 'family-edit-credential' },
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().secrets).toEqual({ trakt: 'connected' });
    expect(JSON.stringify(authorized.json())).not.toContain('trakt-token');

    const manifest = await app.inject({ method: 'GET', url: manifestPath });
    expect(manifest.statusCode).toBe(200);
    const manifestBody = manifest.json();
    expect(manifestBody.id).toBe('community.metalayer');
    expect(JSON.stringify(manifestBody)).not.toContain('trakt-token');
  });
});
