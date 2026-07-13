import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { ProviderHealthRegistry } from '@metalayer/providers';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 47).toString('base64');
const TOKEN = 'dashboard-test-token-32chars!!';

describe('@metalayer/server dashboard', () => {
  const previous = process.env.METALAYER_DASHBOARD_TOKEN;
  process.env.METALAYER_DASHBOARD_TOKEN = TOKEN;

  const store = createMemoryConfigurationStore(TEST_KEY);
  const providerHealth = new ProviderHealthRegistry();
  const appPromise = buildApp({ logger: false, store, providerHealth });

  afterAll(async () => {
    await (await appPromise).close();
    if (previous === undefined) delete process.env.METALAYER_DASHBOARD_TOKEN;
    else process.env.METALAYER_DASHBOARD_TOKEN = previous;
  });

  afterEach(() => {
    process.env.METALAYER_DASHBOARD_TOKEN = TOKEN;
  });

  it('rejects missing/invalid operator tokens', async () => {
    const app = await appPromise;
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/overview',
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().code).toBe('DASHBOARD_UNAUTHORIZED');

    const bad = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/overview',
      headers: { 'x-metalayer-dashboard-token': 'nope' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('returns overview metrics logs backup and updates for operators', async () => {
    const app = await appPromise;
    await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'dash-edit',
        config: createDefaultMetaLayerConfig({ name: 'Dash Config' }),
      },
    });

    const headers = { 'x-metalayer-dashboard-token': TOKEN };
    const overview = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/overview',
      headers,
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().health.mode).toMatch(/lite|server/);
    expect(overview.json().health.activeConfigurations).toBeGreaterThan(0);
    expect(overview.json().modules).toContain('backups');

    const metrics = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/metrics',
      headers,
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json().metrics.requestsTotal).toBeGreaterThan(0);

    const logs = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/logs',
      headers,
    });
    expect(logs.statusCode).toBe(200);

    const backup = await app.inject({
      method: 'POST',
      url: '/api/v1/dashboard/backups',
      headers,
    });
    expect(backup.statusCode).toBe(200);
    expect(backup.json().backup.includesSecrets).toBe(false);
    expect(backup.json().backup.configurations.length).toBeGreaterThan(0);

    const updates = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/updates',
      headers,
    });
    expect(updates.statusCode).toBe(200);
    expect(updates.json().currentVersion).toBeTruthy();

    providerHealth.getOrCreate('tmdb').recordFailure('upstream');
    const health = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/health',
      headers,
    });
    expect(health.statusCode).toBe(200);
    expect(health.json().providers.tmdb.state).toBe('degraded');
  });
});
