export type MediaType = 'movie' | 'series' | 'anime';

export type ProviderCategory =
  | 'metadata'
  | 'artwork'
  | 'ratings'
  | 'catalog'
  | 'tracking'
  | 'identity'
  | 'ai';

export type ConnectionState =
  | 'not_configured'
  | 'connected'
  | 'invalid'
  | 'expired'
  | 'degraded'
  | 'coming_soon';

export type MetadataField =
  | 'title'
  | 'originalTitle'
  | 'description'
  | 'poster'
  | 'background'
  | 'logo'
  | 'rating'
  | 'voteCount'
  | 'releaseDate'
  | 'runtime'
  | 'genres'
  | 'cast'
  | 'directors'
  | 'writers'
  | 'trailers'
  | 'episodes'
  | 'externalIds';

export type CatalogCapability =
  | 'trending'
  | 'popular'
  | 'topRated'
  | 'search'
  | 'personalLists'
  | 'recommendations'
  | 'streaming';

/**
 * Capability declaration for a provider adapter.
 * UI options must derive from this instead of hard-coded provider assumptions.
 */
export interface ProviderCapabilities {
  mediaTypes: MediaType[];
  metadataFields: MetadataField[];
  catalogFeatures: CatalogCapability[];
  supportsSearch: boolean;
  supportsPagination: boolean;
  supportsRegion: boolean;
  supportsLanguage: boolean;
  supportsAgeRating: boolean;
  supportsDigitalRelease: boolean;
  supportsTracking: boolean;
  supportsOAuth: boolean;
}

export interface ProviderDefinition {
  id: string;
  /** Brand names stay untranslated unless the provider supplies an official localized brand. */
  name: string;
  categories: ProviderCategory[];
  /** Current scaffold state until adapters exist. */
  connectionState: ConnectionState;
  capabilities: ProviderCapabilities;
  requiresCredential: boolean;
  requiresOAuth: boolean;
}
