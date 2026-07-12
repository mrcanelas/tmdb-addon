#!/usr/bin/env node
/**
 * Proactively refresh Trakt/MAL OAuth tokens before expiry.
 * Safe for cron: never prints tokens or vault plaintext.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PostgresConfigurationStore,
  SqliteConfigurationStore,
  type ConfigurationStore,
} from '@metalayer/persistence';
import { parseEncryptionKeyRingFromEnv } from '@metalayer/security';
import { runProactiveTrackingRefresh } from '../apps/server/src/tracking-token-refresh.ts';

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
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found at ${sqlitePath}`);
  }
  return new SqliteConfigurationStore({
    sqlitePath,
    encryptionKey: ring,
  });
}

async function main() {
  console.log('MetaLayer tracking token refresh');
  console.log('--------------------------------');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);

  const store = await openStore();
  try {
    const result = await runProactiveTrackingRefresh({ store, dryRun });
    console.log(`Scanned: ${result.scanned}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(
      `${dryRun ? 'Would refresh' : 'Refreshed'}: ${result.refreshed}`,
    );
    console.log(`Failed: ${result.failed.length}`);
    for (const failure of result.failed) {
      console.log(
        `- ${failure.configId} / ${failure.provider}: ${failure.error}`,
      );
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
