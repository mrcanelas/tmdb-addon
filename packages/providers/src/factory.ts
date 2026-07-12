import type { ProviderAdapter, ProviderHttpPolicy } from './core/runtime.js';
import type { ProviderCacheStore } from './core/provider-cache.js';
import type { TmdbFetch } from './tmdb/adapter.js';
import { TmdbProviderAdapter } from './tmdb/adapter.js';
import { FanartArtworkAdapter } from './artwork/fanart.js';
import { RpdbArtworkAdapter } from './artwork/rpdb.js';
import { ImdbRatingsAdapter } from './ratings/imdb.js';
import { AnilistProviderAdapter } from './anilist/adapter.js';
import { MalJikanProviderAdapter } from './mal/adapter.js';
import { KitsuProviderAdapter } from './kitsu/adapter.js';
import { TraktTrackingAdapter } from './trakt/adapter.js';
import { SimklTrackingAdapter } from './simkl/adapter.js';
import { getProvider } from './registry.js';

export { listAdapterProviderIds } from './adapter-ids.js';

export interface CreateProviderAdapterOptions {
  apiKey?: string;
  fetchImpl?: TmdbFetch;
  policy?: Partial<ProviderHttpPolicy>;
  cache?: ProviderCacheStore;
  cacheTtlMs?: number;
  stremioPublicId?: 'imdb' | 'tmdb';
  /** Self-hosted or alternate Jikan base URL. */
  jikanBaseUrl?: string;
  /** OAuth access token for tracking providers. */
  accessToken?: string;
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
      return new ImdbRatingsAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        cache: options.cache,
        cacheTtlMs: options.cacheTtlMs,
      });
    case 'anilist':
      return new AnilistProviderAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'mal':
      return new MalJikanProviderAdapter({
        baseUrl: options.jikanBaseUrl,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'kitsu':
      return new KitsuProviderAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'trakt':
      return new TraktTrackingAdapter({
        accessToken: options.accessToken ?? options.apiKey,
        clientId: process.env.TRAKT_CLIENT_ID,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    case 'simkl':
      return new SimklTrackingAdapter({
        accessToken: options.accessToken ?? options.apiKey,
        clientId: process.env.SIMKL_CLIENT_ID,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
      });
    default:
      return null;
  }
}
