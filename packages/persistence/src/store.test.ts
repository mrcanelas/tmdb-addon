import { describe, expect, it, afterEach } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from './index.js';

const TEST_KEY = Buffer.alloc(32, 9).toString('base64');

describe('@metalayer/persistence', () => {
  let store = createMemoryConfigurationStore(TEST_KEY);

  afterEach(() => {
    store.close();
    store = createMemoryConfigurationStore(TEST_KEY);
  });

  it('persists configuration without returning plaintext secrets', () => {
    const created = store.create({
      config: createDefaultMetaLayerConfig({ name: 'Family' }),
      editCredential: 'edit-secret-1',
      secrets: { tmdb: 'tmdb-live-key' },
    });

    expect(created.configId).toMatch(/^ml_/);
    expect(created.manifestPath).toBe(`/c/${created.configId}/manifest.json`);
    expect(created.config.name).toBe('Family');
    expect(created.secrets).toEqual({ tmdb: 'connected' });
    expect(JSON.stringify(created)).not.toContain('tmdb-live-key');

    const loaded = store.getPublic(created.configId);
    expect(loaded?.secrets.tmdb).toBe('connected');
    expect(store.getSecretPlaintext(created.configId, 'tmdb')).toBe('tmdb-live-key');
  });

  it('verifies edit credentials without exposing the hash', () => {
    const created = store.create({
      config: createDefaultMetaLayerConfig(),
      editCredential: 'another-edit-token',
    });
    expect(store.verifyEditAccess(created.configId, 'another-edit-token')).toBe(true);
    expect(store.verifyEditAccess(created.configId, 'nope')).toBe(false);
    expect(JSON.stringify(created)).not.toContain('another-edit-token');
  });
});
