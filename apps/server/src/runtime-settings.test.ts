import { expect, it } from 'vitest';
import {
  createMemoryConfigurationStore,
  PostgresConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import { RuntimeSettings } from './runtime-settings.js';

const encryptionKey = Buffer.alloc(32, 39).toString('base64');
const redisUrl = 'redis://user:rc-migration-test@localhost:6379';

async function verifySecretMigration(store: ConfigurationStore) {
  const env = { POSTGRES_URL: 'postgres://bootstrap:secret@db/metalayer' };
  try {
    await store.setInstanceSetting('REDIS_URL', redisUrl);
    await store.setInstanceSetting('POSTGRES_URL', 'postgres://legacy:secret@db/metalayer');
    const settings = new RuntimeSettings(store, env);
    await settings.load();

    expect(settings.get('REDIS_URL')).toBe(redisUrl);
    expect(settings.get('POSTGRES_URL')).toBe(env.POSTGRES_URL);
    expect(await store.getInstanceSetting('REDIS_URL')).toBeNull();
    expect(await store.getInstanceSetting('POSTGRES_URL')).toBeNull();
    const vaultRows = await store.listInstanceVaultSecretRows();
    expect(vaultRows.some((row) => row.provider === 'runtime-setting:REDIS_URL')).toBe(true);
    expect(JSON.stringify(vaultRows)).not.toContain('rc-migration-test');
    expect(JSON.stringify(settings.list())).not.toContain('rc-migration-test');
    await expect(settings.set('POSTGRES_URL', env.POSTGRES_URL)).rejects.toMatchObject({
      code: 'SETTING_NOT_EDITABLE',
    });
    await expect(settings.set('REDIS_URL', 'https://example.com')).rejects.toThrow();

    const nextUrl = 'rediss://user:rc-new-test@localhost:6379';
    expect(await settings.set('REDIS_URL', nextUrl)).toMatchObject({
      restartRequired: true,
      setting: { value: '********' },
    });
    const restarted = new RuntimeSettings(store, env);
    await restarted.load();
    expect(restarted.get('REDIS_URL')).toBe(nextUrl);
    await restarted.clear('REDIS_URL');
    await restarted.load();
    expect(restarted.get('REDIS_URL')).toBeUndefined();
  } finally {
    await store.deleteInstanceVaultSecret('runtime-setting:REDIS_URL', 'session');
    await store.deleteInstanceVaultSecret('runtime-setting:POSTGRES_URL', 'session');
    await store.close();
  }
}

it('migrates and updates encrypted instance settings in SQLite', async () => {
  await verifySecretMigration(createMemoryConfigurationStore(encryptionKey));
});

it.runIf(Boolean(process.env.POSTGRES_URL))('migrates and updates encrypted instance settings in Postgres', async () => {
  const store = await PostgresConfigurationStore.connect({
    connectionString: process.env.POSTGRES_URL!,
    encryptionKey,
  });
  await verifySecretMigration(store);
});
