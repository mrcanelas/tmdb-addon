import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 13).toString('base64');

describe('@metalayer/api revisions and export', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('lists revisions, restores a previous snapshot, and exports safely', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        name: 'Original',
        editCredential: 'history-edit-credential',
        secrets: { tmdb: 'vaulted-tmdb' },
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'history-edit-credential' };

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}`,
      headers,
      payload: {
        note: 'rename',
        config: createDefaultMetaLayerConfig({ name: 'Updated' }),
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().config.name).toBe('Updated');

    const revisions = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/revisions`,
      headers,
    });
    expect(revisions.statusCode).toBe(200);
    expect(revisions.json().revisions).toHaveLength(2);
    const firstRevisionId = revisions.json().revisions[1].revisionId;

    const restored = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/revisions/${firstRevisionId}/restore`,
      headers,
      payload: {},
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().config.name).toBe('Original');

    const exported = await app.inject({
      method: 'GET',
      url: `/api/v1/configurations/${configId}/export`,
      headers,
    });
    expect(exported.statusCode).toBe(200);
    const body = exported.json();
    expect(body.format).toBe('metalayer-config-export');
    expect(body.includesSecrets).toBe(false);
    expect(body.secrets).toEqual({ tmdb: 'connected' });
    expect(JSON.stringify(body)).not.toContain('vaulted-tmdb');
    expect(JSON.stringify(body)).not.toContain('history-edit-credential');
  });
});
