#!/usr/bin/env node
/**
 * Restore a MetaLayer instance backup produced by metalayer-backup.mjs.
 *
 * Usage:
 *   pnpm metalayer:restore --from ./backups/metalayer-….sqlite --to ./data/metalayer.sqlite
 *   pnpm metalayer:restore --from ./backups/metalayer-….pg.dump
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

const from = argValue('--from');
if (!from) {
  console.error('Usage: pnpm metalayer:restore --from <backup.sqlite|backup.pg.dump> [--to <sqlitePath>]');
  process.exit(1);
}
const source = resolve(from);
if (!existsSync(source)) {
  console.error(`Backup not found: ${source}`);
  process.exit(1);
}

if (source.endsWith('.sqlite')) {
  const target = resolve(
    argValue('--to') ?? process.env.METALAYER_SQLITE_PATH ?? './data/metalayer.sqlite',
  );
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`Restored SQLite backup to ${target}`);
  console.log('Restart MetaLayer with the same METALAYER_ENCRYPTION_KEY used when the backup was taken.');
  process.exit(0);
}

if (source.endsWith('.pg.dump') || source.endsWith('.dump')) {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error('POSTGRES_URL is required to restore a Postgres custom dump.');
    process.exit(1);
  }
  const result = spawnSync(
    'pg_restore',
    ['--clean', '--if-exists', `--dbname=${postgresUrl}`, source],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'pg_restore failed');
    process.exit(1);
  }
  console.log('Restored Postgres dump. Restart MetaLayer with the matching encryption key.');
  process.exit(0);
}

console.error('Unrecognized backup format. Expected .sqlite or .pg.dump');
process.exit(1);
