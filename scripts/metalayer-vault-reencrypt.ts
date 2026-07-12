#!/usr/bin/env node
/**
 * Progressive re-encryption of Secret Vault rows onto the active key version.
 *
 * Operator flow (AGENTS.md §23.4):
 * 1. Keep the old key as METALAYER_ENCRYPTION_PREVIOUS_KEYS=1:<old>
 * 2. Set METALAYER_ENCRYPTION_KEY=<new> and METALAYER_ENCRYPTION_KEY_VERSION=2
 * 3. Restart the API so runtime can decrypt with the ring
 * 4. Run: pnpm metalayer:vault-reencrypt --dry-run
 * 5. Run: pnpm metalayer:vault-reencrypt
 * 6. Remove PREVIOUS_KEYS only after reencrypt reports zero pending / failed
 *
 * Never prints plaintext or full ciphertext.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PostgresConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import { parseEncryptionKeyRingFromEnv } from '@metalayer/security';

const dryRun = process.argv.includes('--dry-run');

async function openStore(): Promise<ConfigurationStore> {
  const ring = parseEncryptionKeyRingFromEnv(process.env);
  const postgresUrl = process.env.POSTGRES_URL?.trim();
  if (postgresUrl) {
    console.log('Backend: PostgreSQL (POSTGRES_URL)');
    return PostgresConfigurationStore.connect({
      connectionString: postgresUrl,
      encryptionKey: ring,
    });
  }

  const sqlitePath = resolve(
    process.env.METALAYER_SQLITE_PATH || './data/metalayer.sqlite',
  );
  console.log(`Backend: SQLite (${sqlitePath})`);
  console.log(`SQLite present: ${existsSync(sqlitePath) ? 'yes' : 'no'}`);
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found at ${sqlitePath}`);
  }
  return new SqliteConfigurationStore({
    sqlitePath,
    encryptionKey: ring,
  });
}

async function main() {
  console.log('MetaLayer vault re-encrypt');
  console.log('--------------------------');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);

  const store = await openStore();
  try {
    const result = await store.reencryptVaultSecrets({ dryRun });
    console.log(`Active key version: ${result.activeVersion}`);
    console.log(`Total vault rows: ${result.total}`);
    console.log(`Already current: ${result.alreadyCurrent}`);
    console.log(
      `${dryRun ? 'Would reencrypt' : 'Reencrypted'}: ${result.reencrypted}`,
    );
    console.log(`Failed: ${result.failed.length}`);
    for (const failure of result.failed) {
      console.log(`- ${failure.id}: ${failure.error}`);
    }
    if (result.failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
