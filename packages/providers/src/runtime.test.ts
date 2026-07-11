import { describe, expect, it } from 'vitest';
import { ProviderError } from './core/errors.js';
import { buildProviderCacheKey } from './core/cache-key.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  withRetry,
} from './core/runtime.js';
import { tmdbLocaleAdapter } from './locale/tmdb.js';
import {
  languageOnlyLocaleAdapter,
  unsupportedLocaleAdapter,
} from './locale/adapters.js';

describe('@metalayer/providers runtime', () => {
  it('builds locale-sensitive cache keys without secrets', () => {
    const key = buildProviderCacheKey({
      providerId: 'tmdb',
      operation: 'movie',
      identity: '550',
      locale: 'pt-BR',
      region: 'BR',
      fallbackChain: ['pt-BR', 'pt', 'en-US'],
    });
    expect(key).toContain('tmdb|movie|550|pt-BR|BR|pt-br>pt>en-us|-');
    expect(key).not.toMatch(/api[_-]?key/i);
  });

  it('converts MetaLayer locales for TMDB language/region params', () => {
    expect(tmdbLocaleAdapter.toProviderLocale({ locale: 'pt-BR' })).toEqual({
      language: 'pt-BR',
      region: 'BR',
    });
    expect(tmdbLocaleAdapter.getFallbacks('pt-BR')).toEqual([
      'pt-BR',
      'pt',
      'en-US',
      'en',
    ]);
    expect(languageOnlyLocaleAdapter.toProviderLocale({ locale: 'pt-BR' })).toEqual({
      language: 'pt',
      region: undefined,
    });
    expect(unsupportedLocaleAdapter.supportsLocale('en-US')).toBe(false);
  });

  it('retries transient failures and opens the circuit after threshold', async () => {
    const policy = {
      ...DEFAULT_PROVIDER_HTTP_POLICY,
      maxRetries: 1,
      backoffMs: 1,
      circuitFailureThreshold: 2,
      circuitOpenMs: 60_000,
      timeoutMs: 1_000,
    };
    const health = new ProviderHealthTracker(policy);
    let calls = 0;

    await expect(
      withRetry({
        providerId: 'demo',
        policy,
        health,
        execute: async () => {
          calls += 1;
          throw new ProviderError({
            code: 'upstream',
            providerId: 'demo',
            message: 'boom',
            retryable: true,
          });
        },
      }),
    ).rejects.toMatchObject({ code: 'upstream' });

    expect(calls).toBe(2);
    expect(health.snapshot().state).toBe('open');

    await expect(
      withRetry({
        providerId: 'demo',
        policy,
        health,
        execute: async () => 'ok',
      }),
    ).rejects.toMatchObject({ code: 'circuit_open' });
  });
});
