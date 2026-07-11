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
} from './tmdb/adapter.js';
