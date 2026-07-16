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
export { ProviderHealthRegistry } from './core/health-registry.js';
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
  TmdbSeasonSummary,
  TmdbEpisodeSummary,
  TmdbCatalogItem,
} from './tmdb/adapter.js';

export { FanartArtworkAdapter } from './artwork/fanart.js';
export type { FanartAdapterOptions } from './artwork/fanart.js';
export {
  AioRatingsArtworkAdapter,
  OpenPosterDbArtworkAdapter,
  RpdbArtworkAdapter,
  TopPostersArtworkAdapter,
} from './artwork/rpdb.js';
export type { RpdbAdapterOptions, RpdbMediaType } from './artwork/rpdb.js';
export {
  RatedPosterArtworkAdapter,
} from './artwork/rated-poster-adapter.js';
export type { RatedPosterAdapterOptions } from './artwork/rated-poster-adapter.js';
export {
  RATED_POSTER_PROFILES,
  buildRatedPosterUrl,
  buildTmdbMediaPath,
  artworkKindToPathSegment,
  isEnglishLocale,
  toRatedPosterLang,
} from './artwork/rated-poster.js';
export type {
  RatedPosterExtension,
  RatedPosterIdType,
  RatedPosterMediaType,
  RatedPosterProviderId,
  RatedPosterServiceProfile,
} from './artwork/rated-poster.js';
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

export { GeminiAiAdapter } from './ai/gemini.js';
export type { GeminiAdapterOptions } from './ai/gemini.js';
export { GroqAiAdapter } from './ai/groq.js';
export type { GroqAdapterOptions } from './ai/groq.js';
export { OpenRouterAiAdapter } from './ai/openrouter.js';
export type { OpenRouterAdapterOptions } from './ai/openrouter.js';
export { AiProviderAdapter } from './ai/ai-adapter.js';
export type { AiAdapterOptions } from './ai/ai-adapter.js';
export {
  AI_SERVICE_PROFILES,
  OPENAI_COMPATIBLE_CHAT_PROFILES,
} from './ai/ai-profiles.js';
export type { AiProviderId, AiServiceProfile } from './ai/ai-profiles.js';
export {
  buildTitleSearchPrompt,
  fetchOpenAiCompatibleChatCompletion,
  parseCommaSeparatedTitles,
  searchTitlesWithOpenAiCompatible,
} from './ai/openai-compatible.js';
export type {
  OpenAiCompatibleChatProfile,
  OpenAiCompatibleMediaType,
} from './ai/openai-compatible.js';

export type {
  AnimeCatalogItem,
  AnimeMetadataSummary,
  AnimeProviderFetch,
} from './anime/types.js';
export { AnilistProviderAdapter } from './anilist/adapter.js';
export type { AnilistAdapterOptions } from './anilist/adapter.js';
export {
  AnilistTrackingAdapter,
  buildAnilistAuthorizeUrl,
  exchangeAnilistAuthorizationCode,
} from './anilist/tracking.js';
export type {
  AnilistOAuthTokens,
  AnilistTrackingAdapterOptions,
  AnilistWatchStateFixture,
} from './anilist/tracking.js';
export { MalJikanProviderAdapter } from './mal/adapter.js';
export type { JikanAdapterOptions } from './mal/adapter.js';
export {
  MalTrackingAdapter,
  buildMalAuthorizeUrl,
  exchangeMalAuthorizationCode,
  generateMalPkceVerifier,
  refreshMalAccessToken,
} from './mal/tracking.js';
export type {
  MalOAuthTokens,
  MalTrackingAdapterOptions,
  MalWatchStateFixture,
} from './mal/tracking.js';
export { KitsuProviderAdapter } from './kitsu/adapter.js';
export type { KitsuAdapterOptions } from './kitsu/adapter.js';
export { TraktTrackingAdapter, buildTraktAuthorizeUrl, exchangeTraktAuthorizationCode, refreshTraktAccessToken } from './trakt/adapter.js';
export type {
  TraktAdapterOptions,
  TraktWatchStateFixture,
  TraktOAuthTokens,
} from './trakt/adapter.js';
export {
  SimklTrackingAdapter,
  buildSimklAuthorizeUrl,
  exchangeSimklAuthorizationCode,
} from './simkl/adapter.js';
export type {
  SimklAdapterOptions,
  SimklOAuthTokens,
  SimklWatchStateFixture,
} from './simkl/adapter.js';

export { PublicMetaDBAdapter } from './publicmetadb/adapter.js';
export type {
  PublicMetaDBAdapterOptions,
  PublicMetaDBCatalogItem,
} from './publicmetadb/adapter.js';
export {
  PUBLIC_METADB_BASE_URL,
  buildPublicMetaDBUrl,
  fetchPublicMetaDBListItems,
  fetchPublicMetaDBLists,
  fetchPublicMetaDBPickItems,
  fetchPublicMetaDBPicks,
  fetchPublicMetaDBResume,
  isPublicMetaDBApiKey,
  markPublicMetaDBWatched,
  publicMetaDBRequest,
  validatePublicMetaDBKey,
} from './publicmetadb/client.js';
export type {
  PublicMetaDBListSummary,
  PublicMetaDBMediaRef,
  PublicMetaDBMediaType,
  PublicMetaDBPaginated,
  PublicMetaDBPickSummary,
} from './publicmetadb/client.js';

export {
  createProviderAdapter,
  listAdapterProviderIds,
} from './factory.js';
export type { CreateProviderAdapterOptions } from './factory.js';
