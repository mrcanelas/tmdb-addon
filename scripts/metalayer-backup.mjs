#!/usr/bin/env node
/**
 * MetaLayer instance backup (SQLite file copy or Postgres pg_dump guidance).
 * Secrets in the DB stay encrypted; METALAYER_ENCRYPTION_KEY is never written.
 *
 * Usage:
 *   pnpm metalayer:backup --out ./backups
 *   METALAYER_SQLITE_PATH=./data/metalayer.sqlite pnpm metalayer:backup --out ./backups
 */
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

const outDir = resolve(argValue('--out') ?? './backups');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const manifest = {
  format: 'metalayer-instance-backup',
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  includesEncryptionKey: false,
  notes: [
    'Store METALAYER_ENCRYPTION_KEY separately — never inside this backup.',
    'Restore with: pnpm metalayer:restore --from <artifact>',
  ],
  artifacts: [],
};

const sqlitePath = process.env.METALAYER_SQLITE_PATH;
const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl && sqlitePath && sqlitePath !== ':memory:' && existsSync(sqlitePath)) {
  const target = join(outDir, `metalayer-${stamp}.sqlite`);
  copyFileSync(sqlitePath, target);
  manifest.artifacts.push({ kind: 'sqlite', path: basename(target) });
  console.log(`Wrote ${target}`);
} else if (postgresUrl) {
  const dumpPath = join(outDir, `metalayer-${stamp}.pg.dump`);
  const result = spawnSync(
    'pg_dump',
    ['--format=custom', `--file=${dumpPath}`, postgresUrl],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(`pg_dump failed (${result.error?.code ?? result.status ?? 'unknown exit'}).`);
    console.error('Install PostgreSQL client tools or backup manually.');
    process.exit(1);
  }
  manifest.artifacts.push({ kind: 'postgres-custom', path: basename(dumpPath) });
  console.log(`Wrote ${dumpPath}`);
} else {
  console.error('Set METALAYER_SQLITE_PATH to an existing file or POSTGRES_URL for pg_dump.');
  process.exit(1);
}

const manifestPath = join(outDir, `metalayer-backup-${stamp}.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifestPath}`);
