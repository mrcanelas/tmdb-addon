#!/usr/bin/env node
/**
 * Lightweight e2e smoke against a running MetaLayer server.
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

async function mustOk(path, headers) {
  const response = await fetch(`${base}${path}`, { headers, redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`${path} → ${response.status}`);
  }
  return response;
}

await mustOk('/configure/');
const health = await (await mustOk('/api/v1/health')).json();
if (health.service !== 'metalayer-api') throw new Error('Unexpected health response');
const legacy = await (await mustOk('/manifest.json')).json();
if (legacy.id !== 'tmdb-addon') throw new Error('Unexpected legacy manifest identity');

const token = process.env.METALAYER_DASHBOARD_TOKEN;
const admin = await fetch(`${base}/admin/`, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
if (admin.status !== 200 && admin.status !== 401) throw new Error('Admin UI is unavailable');
if (token) {
  if (new URL(base).protocol !== 'https:' && new URL(base).hostname !== '127.0.0.1') {
    throw new Error('Dashboard credentials require HTTPS or local loopback');
  }
  if (admin.status !== 401) throw new Error('Expected unauthenticated Admin request to return 401');
  await mustOk('/admin/', { authorization: `Basic ${Buffer.from(`operator:${token}`).toString('base64')}` });
  await mustOk('/api/v1/dashboard/health', { 'x-metalayer-dashboard-token': token });
}
console.log(`MetaLayer ${health.version} live smoke passed`);
