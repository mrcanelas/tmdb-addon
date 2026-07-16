import type { ProviderAdapter, ProviderHttpPolicy } from './core/runtime.js';
import type { ProviderCacheStore } from './core/provider-cache.js';
import type { ProviderHealthTracker } from './core/health.js';
import { ProviderHealthRegistry } from './core/health-registry.js';
import { DEFAULT_PROVIDER_HTTP_POLICY } from './core/health.js';
import type { TmdbFetch } from './tmdb/adapter.js';
import { TmdbProviderAdapter } from './tmdb/adapter.js';
import { FanartArtworkAdapter } from './artwork/fanart.js';
import {
  AioRatingsArtworkAdapter,
  OpenPosterDbArtworkAdapter,
  RpdbArtworkAdapter,
  TopPostersArtworkAdapter,
} from './artwork/rpdb.js';
import { GeminiAiAdapter } from './ai/gemini.js';
import { GroqAiAdapter } from './ai/groq.js';
import { OpenRouterAiAdapter } from './ai/openrouter.js';
import { ImdbRatingsAdapter } from './ratings/imdb.js';
import { AnilistProviderAdapter } from './anilist/adapter.js';
import { AnilistTrackingAdapter } from './anilist/tracking.js';
import { MalJikanProviderAdapter } from './mal/adapter.js';
import { MalTrackingAdapter } from './mal/tracking.js';
import { KitsuProviderAdapter } from './kitsu/adapter.js';
import { TraktTrackingAdapter } from './trakt/adapter.js';
import { SimklTrackingAdapter } from './simkl/adapter.js';
import { PublicMetaDBAdapter } from './publicmetadb/adapter.js';
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
  /** Explicit tracker (wins over registry). */
  health?: ProviderHealthTracker;
  /** Shared process registry for cross-request circuit breakers. */
  healthRegistry?: ProviderHealthRegistry;
}

function resolveHealth(
  providerId: string,
  options: CreateProviderAdapterOptions,
): ProviderHealthTracker | undefined {
  if (options.health) return options.health;
  if (!options.healthRegistry) return undefined;
  return options.healthRegistry.getOrCreate(providerId, {
    ...DEFAULT_PROVIDER_HTTP_POLICY,
    ...options.policy,
  });
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
  const health = resolveHealth(providerId, options);

  switch (providerId) {
    case 'tmdb':
      return new TmdbProviderAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        cache: options.cache,
        cacheTtlMs: options.cacheTtlMs,
        stremioPublicId: options.stremioPublicId,
        health,
      });
    case 'fanart':
      return new FanartArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'rpdb':
      return new RpdbArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'topposters':
      return new TopPostersArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'aioratings':
      return new AioRatingsArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'openposterdb':
      return new OpenPosterDbArtworkAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'gemini':
      return new GeminiAiAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'groq':
      return new GroqAiAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'openrouter':
      return new OpenRouterAiAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'imdb':
      return new ImdbRatingsAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        cache: options.cache,
        cacheTtlMs: options.cacheTtlMs,
        health,
      });
    case 'anilist':
      if (options.accessToken) {
        return new AnilistTrackingAdapter({
          accessToken: options.accessToken,
          fetchImpl: options.fetchImpl,
          policy: options.policy,
          health,
        });
      }
      return new AnilistProviderAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'mal':
      if (options.accessToken) {
        return new MalTrackingAdapter({
          accessToken: options.accessToken,
          clientId: process.env.MAL_CLIENT_ID,
          fetchImpl: options.fetchImpl,
          policy: options.policy,
          health,
        });
      }
      return new MalJikanProviderAdapter({
        baseUrl: options.jikanBaseUrl,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'kitsu':
      return new KitsuProviderAdapter({
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'trakt':
      return new TraktTrackingAdapter({
        accessToken: options.accessToken ?? options.apiKey,
        clientId: process.env.TRAKT_CLIENT_ID,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'simkl':
      return new SimklTrackingAdapter({
        accessToken: options.accessToken ?? options.apiKey,
        clientId: process.env.SIMKL_CLIENT_ID,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    case 'publicmetadb':
      return new PublicMetaDBAdapter({
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        policy: options.policy,
        health,
      });
    default:
      return null;
  }
}
