import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { PostgresConfigurationStore } from './postgres-store.js';

const TEST_KEY = Buffer.alloc(32, 11).toString('base64');
const postgresUrl = process.env.POSTGRES_URL;

describe.runIf(Boolean(postgresUrl))('@metalayer/persistence postgres', () => {
  let store: PostgresConfigurationStore;

  afterEach(async () => {
    if (store) await store.close();
  });

  it('persists configuration without returning plaintext secrets', async () => {
    store = await PostgresConfigurationStore.connect({
      connectionString: postgresUrl!,
      encryptionKey: TEST_KEY,
    });

    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'Family PG' }),
      editCredential: 'edit-secret-pg',
      secrets: { tmdb: 'tmdb-live-key' },
    });

    expect(created.configId).toMatch(/^ml_/);
    expect(created.secrets).toEqual({ tmdb: 'connected' });
    expect(JSON.stringify(created)).not.toContain('tmdb-live-key');
    expect(await store.getSecretPlaintext(created.configId, 'tmdb')).toBe(
      'tmdb-live-key',
    );
  });

  it('stores revisions and restores a previous snapshot', async () => {
    store = await PostgresConfigurationStore.connect({
      connectionString: postgresUrl!,
      encryptionKey: TEST_KEY,
    });

    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'v1' }),
      editCredential: 'rev-edit-pg',
    });
    const first = (await store.listRevisions(created.configId))[0]!;
    await store.update(created.configId, {
      config: createDefaultMetaLayerConfig({ name: 'v2' }),
      note: 'rename',
    });
    const restored = await store.restoreRevision(created.configId, first.revisionId);
    expect(restored?.config.name).toBe('v1');
  });
});
