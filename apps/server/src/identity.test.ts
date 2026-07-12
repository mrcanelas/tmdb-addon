import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 33).toString('base64');

describe('@metalayer/server identity graph', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('resolves cross-provider mappings and returns diagnostics', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'identity-edit',
        config: createDefaultMetaLayerConfig({ name: 'Identity' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'identity-edit' };

    const resolved = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/identity/resolve`,
      headers,
      payload: {
        mediaType: 'movie',
        ids: { tmdb: 550, imdb: 'tt0137523' },
      },
    });
    expect(resolved.statusCode).toBe(200);
    const body = resolved.json();
    expect(body.mapping.canonical.id).toMatch(/^metalayer:movie:/);
    expect(body.diagnostics.matches).toEqual(
      expect.arrayContaining([
        { provider: 'tmdb', id: '550' },
        { provider: 'imdb', id: 'tt0137523' },
      ]),
    );
    expect(body.diagnostics.edgeCount).toBeGreaterThan(0);
    expect(body.diagnostics.warnings.some((w: string) => w.includes('tvdb'))).toBe(
      true,
    );

    const diagnostics = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/identity/diagnostics`,
      headers,
      payload: { ids: { tmdb: 550, imdb: 'tt0137523' } },
    });
    expect(diagnostics.statusCode).toBe(200);
    expect(diagnostics.json().diagnostics.canonicalId).toBe(
      body.mapping.canonical.id,
    );
  });
});
