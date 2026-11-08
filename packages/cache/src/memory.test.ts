import { describe, expect, it, vi } from 'vitest';
import { MemoryCache } from './memory.js';
import { cachedLoad } from './cached-load.js';

describe('@metalayer/cache', () => {
  it('returns hits for unexpired locale-sensitive keys and isolates locales', async () => {
    const cache = new MemoryCache();
    let loads = 0;

    const pt = await cachedLoad({
      cache,
      providerId: 'tmdb',
      operation: 'movie',
      identity: '550',
      ctx: { correlationId: 'c1', locale: 'pt-BR', region: 'BR' },
      fallbackChain: ['pt-BR', 'en-US'],
      load: async () => {
        loads += 1;
        return { title: 'Clube da Luta' };
      },
    });

    const ptAgain = await cachedLoad({
      cache,
      providerId: 'tmdb',
      operation: 'movie',
      identity: '550',
      ctx: { correlationId: 'c2', locale: 'pt-BR', region: 'BR' },
      fallbackChain: ['pt-BR', 'en-US'],
      load: async () => {
        loads += 1;
        return { title: 'should-not-load' };
      },
    });

    const en = await cachedLoad({
      cache,
      providerId: 'tmdb',
      operation: 'movie',
      identity: '550',
      ctx: { correlationId: 'c3', locale: 'en-US', region: 'US' },
      fallbackChain: ['en-US'],
      load: async () => {
        loads += 1;
        return { title: 'Fight Club' };
      },
    });

    expect(pt.cacheStatus).toBe('miss');
    expect(ptAgain.cacheStatus).toBe('hit');
    expect(en.cacheStatus).toBe('miss');
    expect(ptAgain.value.title).toBe('Clube da Luta');
    expect(en.value.title).toBe('Fight Club');
    expect(pt.key).not.toBe(en.key);
    expect(loads).toBe(2);
    expect(cache.stats().hits).toBe(1);
  });

  it('shortens TTL for degraded payloads and can serve stale eligible entries', async () => {
    const now = vi.fn(() => 1_000);
    const cache = new MemoryCache({ now });

    await cache.set('degraded', { ok: false }, {
      ttlMs: 60_000,
      degraded: true,
      source: 'tmdb',
    });
    expect((await cache.get('degraded'))?.entry.expiresAt).toBe(1_000 + 30_000);

    await cache.set('stale-ok', { title: 'x' }, {
      ttlMs: 10,
      staleEligible: true,
      source: 'tmdb',
    });
    now.mockReturnValue(1_050);
    expect((await cache.get('stale-ok'))?.status).toBe('stale');
  });

  it('never requires secrets in cache keys', async () => {
    const cache = new MemoryCache();
    const result = await cachedLoad({
      cache,
      providerId: 'tmdb',
      operation: 'movie',
      identity: '550',
      ctx: { correlationId: 'c', locale: 'pt-BR', apiKey: 'secret-key' },
      load: async () => ({ ok: true }),
    });
    expect(result.key).not.toContain('secret-key');
    expect(result.key).toContain('pt-BR');
  });
});
