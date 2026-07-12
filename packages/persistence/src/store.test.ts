import { describe, expect, it, afterEach } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from './index.js';

const TEST_KEY = Buffer.alloc(32, 9).toString('base64');

describe('@metalayer/persistence', () => {
  let store = createMemoryConfigurationStore(TEST_KEY);

  afterEach(async () => {
    await store.close();
    store = createMemoryConfigurationStore(TEST_KEY);
  });

  it('persists configuration without returning plaintext secrets', async () => {
    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'Family' }),
      editCredential: 'edit-secret-1',
      secrets: { tmdb: 'tmdb-live-key' },
    });

    expect(created.configId).toMatch(/^ml_/);
    expect(created.manifestPath).toBe(`/c/${created.configId}/manifest.json`);
    expect(created.config.name).toBe('Family');
    expect(created.secrets).toEqual({ tmdb: 'connected' });
    expect(JSON.stringify(created)).not.toContain('tmdb-live-key');

    const loaded = await store.getPublic(created.configId);
    expect(loaded?.secrets.tmdb).toBe('connected');
    expect(await store.getSecretPlaintext(created.configId, 'tmdb')).toBe('tmdb-live-key');
  });

  it('verifies edit credentials without exposing the hash', async () => {
    const created = await store.create({
      config: createDefaultMetaLayerConfig(),
      editCredential: 'another-edit-token',
    });
    expect(await store.verifyEditAccess(created.configId, 'another-edit-token')).toBe(true);
    expect(await store.verifyEditAccess(created.configId, 'nope')).toBe(false);
    expect(JSON.stringify(created)).not.toContain('another-edit-token');
  });

  it('stores revisions on create/update and can restore a previous snapshot', async () => {
    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'v1' }),
      editCredential: 'rev-edit-token',
    });

    const firstRevisions = await store.listRevisions(created.configId);
    expect(firstRevisions).toHaveLength(1);
    expect(firstRevisions[0].revisionNumber).toBe(1);

    await store.update(created.configId, {
      config: createDefaultMetaLayerConfig({ name: 'v2' }),
      note: 'rename',
    });

    const revisions = await store.listRevisions(created.configId);
    expect(revisions).toHaveLength(2);
    expect(revisions[0].revisionNumber).toBe(2);

    const initial = await store.getRevision(created.configId, firstRevisions[0].revisionId);
    expect(initial?.config.name).toBe('v1');

    const restored = await store.restoreRevision(created.configId, firstRevisions[0].revisionId);
    expect(restored?.config.name).toBe('v1');
    expect(await store.listRevisions(created.configId)).toHaveLength(3);
  });

  it('exports a safe payload without secrets plaintext or edit credentials', async () => {
    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'Export me' }),
      editCredential: 'export-edit-token',
      secrets: { trakt: 'trakt-secret' },
    });

    const exported = await store.exportSafe(created.configId);
    expect(exported?.format).toBe('metalayer-config-export');
    expect(exported?.includesSecrets).toBe(false);
    expect(exported?.secrets).toEqual({ trakt: 'connected' });
    expect(JSON.stringify(exported)).not.toContain('trakt-secret');
    expect(JSON.stringify(exported)).not.toContain('export-edit-token');
  });
});
