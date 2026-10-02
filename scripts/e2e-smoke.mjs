#!/usr/bin/env node
/**
 * Lightweight e2e smoke against a running MetaLayer server (or builds one via test:production path).
 * For CI without a long-lived server, prefer `pnpm test:production`.
 *
 * Usage:
 *   METALAYER_E2E_BASE_URL=http://127.0.0.1:1338 pnpm test:e2e
 */
const base = (process.env.METALAYER_E2E_BASE_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.log('METALAYER_E2E_BASE_URL unset — skipping live e2e (use test:production in CI).');
  process.exit(0);
}

async function mustOk(path) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) {
    throw new Error(`${path} → ${response.status}`);
  }
  return response;
}

const checks = ['/configure/', '/admin/', '/manifest.json'];
for (const path of checks) {
  await mustOk(path);
  console.log(`ok ${path}`);
}
console.log('e2e smoke passed');
