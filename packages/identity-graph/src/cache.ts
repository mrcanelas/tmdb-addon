import type { CacheStore } from '@metalayer/cache';
import type { ResolvedIdentityMapping } from './resolve.js';
import type { IdentityProvider } from './types.js';

export function buildIdentityCacheKey(
  provider: IdentityProvider,
  id: string,
  entityKind = 'movie',
): string {
  return `identity:${entityKind}:${provider}:${String(id).toLowerCase()}`;
}

/**
 * Thin cache helper — store/load resolved mappings by any known external id.
 */
export class IdentityMappingCache {
  constructor(
    private readonly store: CacheStore,
    private readonly ttlMs = 60 * 60_000,
  ) {}

  async get(
    provider: IdentityProvider,
    id: string,
    entityKind = 'movie',
  ): Promise<ResolvedIdentityMapping | null> {
    const key = buildIdentityCacheKey(provider, id, entityKind);
    const hit = await this.store.get<ResolvedIdentityMapping>(key);
    return hit?.entry.value ?? null;
  }

  async set(mapping: ResolvedIdentityMapping, entityKind = 'movie'): Promise<void> {
    for (const match of mapping.matches) {
      const key = buildIdentityCacheKey(match.provider, match.id, entityKind);
      await this.store.set(key, mapping, {
        ttlMs: this.ttlMs,
        source: 'identity-graph',
        degraded: mapping.lowConfidence.length > 0,
        staleEligible: true,
      });
    }
  }
}
