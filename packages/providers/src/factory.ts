import type { ProviderAdapter, ProviderHttpPolicy } from './core/runtime.js';
import type { ProviderCacheStore } from './core/provider-cache.js';
import type { TmdbFetch } from './tmdb/adapter.js';
import { TmdbProviderAdapter } from './tmdb/adapter.js';
import { FanartArtworkAdapter } from './artwork/fanart.js';
import { RpdbArtworkAdapter } from './artwork/rpdb.js';
import { ImdbRatingsStubAdapter } from './ratings/stubs.js';
import { getProvider } from './registry.js';

export interface CreateProviderAdapterOptions {
  apiKey?: string;
  fetchImpl?: TmdbFetch;
  policy?: Partial<ProviderHttpPolicy>;
  cache?: ProviderCacheStore;
  cacheTtlMs?: number;
  stremioPublicId?: 'imdb' | 'tmdb';
}

/**
 * Builds a concrete adapter for a registered provider id.
 * Returns null when the id is unknown or has no adapter yet (coming_soon).
 */
export function createProviderAdapter(
  providerId: string,
  options: CreateProviderAdapterOptions = {},
): ProviderAdapter | null {
  const definition = getProvider(providerId);
  if (!definition) return null;

  switch (providerId) {
    case 'tmdb':
      return new TmdbProviderAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        cache: options.cache,
        cacheTtlMs: options.cacheTtlMs,
        stremioPublicId: options.stremioPublicId,
      });
    case 'fanart':
      return new FanartArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'rpdb':
      return new RpdbArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'imdb':
      return new ImdbRatingsStubAdapter(options.policy);
    default:
      return null;
  }
}

export function listAdapterProviderIds(): string[] {
  return ['tmdb', 'fanart', 'rpdb', 'imdb'];
}
