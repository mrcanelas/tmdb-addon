import assert from 'node:assert/strict';
import { buildApp } from '../apps/server/dist/app.js';

// Run with plain Node, with no TS loader, after building the distributable.
const app = await buildApp({ logger: true, encryptionKey: '0'.repeat(64), sqlitePath: ':memory:',
  env: { METALAYER_ENCRYPTION_KEY: '0'.repeat(64) },
  providerFetch: async () => new Response('{}', { status: 404 }),
});
try {
  assert.equal((await app.inject('/configure/')).statusCode, 200);
  assert.equal((await app.inject('/admin/')).statusCode, 200);
  const legacy = await app.inject('/manifest.json');
  assert.equal(legacy.statusCode, 200);
  assert.equal(legacy.json().id, 'tmdb-addon');
  await app.inject('/api/v1/preview/movie/550?apiKey=PRODUCTION_SMOKE_FAKE_SECRET');
  await app.inject('/legacy-PRODUCTION_SMOKE_FAKE_SECRET/manifest.json');
  console.log('Production bundle smoke passed');
} finally { await app.close(); }
