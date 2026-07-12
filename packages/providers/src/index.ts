export type {
  MediaType,
  ProviderCategory,
  ConnectionState,
  MetadataField,
  CatalogCapability,
  ProviderCapabilities,
  ProviderDefinition,
} from './types.js';

export {
  PROVIDER_REGISTRY,
  listProviders,
  getProvider,
  listProvidersByCategory,
} from './registry.js';

export { ProviderError, classifyHttpStatus } from './core/errors.js';
export type { ProviderErrorKind } from './core/errors.js';

export {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  withRetry,
  withTimeout,
  sleep,
} from './core/runtime.js';
export type {
  ProviderAdapter,
  ProviderContext,
  ProviderHttpPolicy,
  ProviderHealthSnapshot,
} from './core/runtime.js';
export type { HealthState } from './core/health.js';

export { buildProviderCacheKey, hashFallbackChain } from './core/cache-key.js';
export type { ProviderCacheStore, ProviderCacheGetResult } from './core/provider-cache.js';

export type {
  ProviderLocaleAdapter,
  ProviderLocaleInput,
  ProviderLocaleParams,
} from './locale/types.js';
export { baseLanguage, normalizeLocaleTag } from './locale/types.js';
export { tmdbLocaleAdapter } from './locale/tmdb.js';
export {
  languageOnlyLocaleAdapter,
  unsupportedLocaleAdapter,
} from './locale/adapters.js';

export { TmdbProviderAdapter } from './tmdb/adapter.js';
export type {
  TmdbAdapterOptions,
  TmdbFetch,
  TmdbMovieSummary,
  TmdbSeriesSummary,
  TmdbCatalogItem,
} from './tmdb/adapter.js';

export { FanartArtworkAdapter } from './artwork/fanart.js';
export type { FanartAdapterOptions } from './artwork/fanart.js';
export { RpdbArtworkAdapter } from './artwork/rpdb.js';
export type { RpdbAdapterOptions, RpdbMediaType } from './artwork/rpdb.js';
export type {
  ArtworkAsset,
  ArtworkBundle,
  ArtworkKind,
  ProviderFetch,
} from './artwork/types.js';
export { ImdbRatingsAdapter, ImdbRatingsStubAdapter } from './ratings/imdb.js';
export type {
  ImdbMediaType,
  ImdbRating,
  ImdbRatingsAdapterOptions,
} from './ratings/imdb.js';

export type {
  AnimeCatalogItem,
  AnimeMetadataSummary,
  AnimeProviderFetch,
} from './anime/types.js';
export { AnilistProviderAdapter } from './anilist/adapter.js';
export type { AnilistAdapterOptions } from './anilist/adapter.js';
export { MalJikanProviderAdapter } from './mal/adapter.js';
export type { JikanAdapterOptions } from './mal/adapter.js';
export { KitsuProviderAdapter } from './kitsu/adapter.js';
export type { KitsuAdapterOptions } from './kitsu/adapter.js';
export { TraktTrackingAdapter } from './trakt/adapter.js';
export type { TraktAdapterOptions, TraktWatchStateFixture } from './trakt/adapter.js';
export { SimklTrackingAdapter } from './simkl/adapter.js';
export type { SimklAdapterOptions, SimklWatchStateFixture } from './simkl/adapter.js';

export {
  createProviderAdapter,
  listAdapterProviderIds,
} from './factory.js';
export type { CreateProviderAdapterOptions } from './factory.js';
