import { afterAll, describe, expect, it } from 'vitest';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { ProviderHealthRegistry } from '@metalayer/providers';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 17).toString('base64');

describe('@metalayer/server sources diagnostics', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({
    logger: false,
    store,
    providerFetch: async (url) => {
      const value = String(url);
      if (value.includes('webservice.fanart.tv') || value.includes('ratingposterdb.com')) {
        return new Response(JSON.stringify({ movieposter: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (value.includes('api_key=vaulted-tmdb-key')) {
        return new Response(JSON.stringify({ images: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('unauthorized', { status: 401 });
    },
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('lists registered sources with adapter availability', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/api/v1/sources' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.sources.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(['tmdb', 'tvdb', 'fanart']),
    );
    const tmdb = body.sources.find((s: { id: string }) => s.id === 'tmdb');
    expect(tmdb.adapterAvailable).toBe(true);
    expect(tmdb.capabilities.supportsLanguage).toBe(true);
  });

  it('tests TMDB using vaulted credentials without exposing secrets', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        name: 'Sources',
        editCredential: 'sources-edit-credential',
        secrets: { tmdb: 'vaulted-tmdb-key' },
      },
    });
    const { configId } = created.json();

    const fanart = await app.inject({
      method: 'POST',
      url: '/api/v1/sources/fanart/test',
      payload: { apiKey: 'fanart-test-key', locale: 'pt-BR' },
    });
    expect(fanart.statusCode).toBe(200);
    expect(fanart.json().ok).toBe(true);
    expect(fanart.json().cacheKeyExample).toContain('fanart|ping');
    expect(JSON.stringify(fanart.json())).not.toContain('fanart-test-key');

    const tmdb = await app.inject({
      method: 'POST',
      url: '/api/v1/sources/tmdb/test',
      headers: { 'x-metalayer-edit-credential': 'sources-edit-credential' },
      payload: { configId, locale: 'pt-BR', region: 'BR' },
    });
    expect(tmdb.statusCode).toBe(200);
    const body = tmdb.json();
    expect(body.ok).toBe(true);
    expect(body.providerId).toBe('tmdb');
    expect(body.locale.providerParams).toEqual({ language: 'pt-BR', region: 'BR' });
    expect(body.cacheKeyExample).toContain('tmdb|ping|');
    expect(JSON.stringify(body)).not.toContain('vaulted-tmdb-key');
  });

  it('rejects unknown providers with stable error codes', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sources/not-a-provider',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('accumulates circuit failures across requests via shared health registry', async () => {
    let fetchCalls = 0;
    const providerHealth = new ProviderHealthRegistry({
      circuitFailureThreshold: 2,
      circuitOpenMs: 60_000,
      maxRetries: 0,
      backoffMs: 1,
      timeoutMs: 1_000,
    });

    const app = await buildApp({
      logger: false,
      store: createMemoryConfigurationStore(TEST_KEY),
      providerHealth,
      providerFetch: async () => {
        fetchCalls += 1;
        return new Response('upstream', { status: 500 });
      },
    });

    try {
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/sources/tmdb/test',
        payload: { apiKey: 'k', locale: 'en-US' },
      });
      expect(first.statusCode).toBe(502);
      expect(first.json().ok).toBe(false);
      expect(first.json().health.state).toBe('degraded');
      expect(fetchCalls).toBe(1);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/sources/tmdb/test',
        payload: { apiKey: 'k', locale: 'en-US' },
      });
      expect(second.statusCode).toBe(502);
      expect(second.json().health.state).toBe('open');
      expect(fetchCalls).toBe(2);

      const beforeOpen = fetchCalls;
      const third = await app.inject({
        method: 'POST',
        url: '/api/v1/sources/tmdb/test',
        payload: { apiKey: 'k', locale: 'en-US' },
      });
      expect(third.statusCode).toBe(502);
      expect(third.json().error.providerCode).toBe('circuit_open');
      expect(fetchCalls).toBe(beforeOpen);

      const listed = await app.inject({ method: 'GET', url: '/api/v1/sources' });
      const tmdb = listed.json().sources.find((s: { id: string }) => s.id === 'tmdb');
      expect(tmdb.health.state).toBe('open');
      expect(tmdb.health.consecutiveFailures).toBeGreaterThanOrEqual(2);
    } finally {
      await app.close();
    }
  });
});
