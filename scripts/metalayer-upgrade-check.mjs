#!/usr/bin/env node
/**
 * MetaLayer upgrade check — prints version channel and operator checklist.
 * Does not mutate the database; safe to run before upgrades.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const identityPath = resolve('packages/identity/src/index.ts');
let version = 'unknown';

try {
  const { METALAYER } = require('@metalayer/identity');
  version = METALAYER.version;
} catch {
  if (existsSync(identityPath)) {
    const text = readFileSync(identityPath, 'utf8');
    const match = text.match(/version:\s*['"]([^'"]+)['"]/);
    if (match) version = match[1];
  }
}

const sqlitePath = process.env.METALAYER_SQLITE_PATH || './data/metalayer.sqlite';

console.log(`MetaLayer upgrade check`);
console.log(`----------------------`);
console.log(`Current version: ${version}`);
console.log(`Channel: 1.0.0-alpha`);
console.log(`SQLite path: ${sqlitePath}`);
console.log(`SQLite present: ${existsSync(sqlitePath) ? 'yes' : 'no'}`);
console.log('');
console.log('Before upgrading:');
console.log('1. Export a secret-free backup from the operator dashboard.');
console.log('2. Keep METALAYER_ENCRYPTION_KEY unchanged.');
console.log('3. Review CHANGELOG / phase exit docs for breaking alpha changes.');
console.log('4. Restart the API process after image/package updates.');
console.log('');
console.log('Lite:   docker compose -f docker/docker-compose.lite.yml up -d --build');
console.log('Server: docker compose -f docker/docker-compose.server.yml up -d --build');
