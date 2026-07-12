import type { ProviderCapabilities, ProviderDefinition } from './types.js';

const metadataBase = (
  overrides: Partial<ProviderCapabilities> = {},
): ProviderCapabilities => ({
  mediaTypes: ['movie', 'series'],
  metadataFields: ['title', 'description', 'poster', 'background', 'genres', 'cast', 'externalIds'],
  catalogFeatures: ['trending', 'popular', 'topRated', 'search'],
  supportsSearch: true,
  supportsPagination: true,
  supportsRegion: true,
  supportsLanguage: true,
  supportsAgeRating: true,
  supportsDigitalRelease: false,
  supportsTracking: false,
  supportsOAuth: false,
  ...overrides,
});

/**
 * Planned providers for MetaLayer 1.0.
 * Adapters are not implemented yet — this registry drives Sources UI and capability warnings.
 */
export const PROVIDER_REGISTRY: ProviderDefinition[] = [
  {
    id: 'tmdb',
    name: 'TMDB',
    categories: ['metadata', 'artwork', 'catalog', 'ratings'],
    connectionState: 'not_configured',
    requiresCredential: true,
    requiresOAuth: true,
    capabilities: metadataBase({
      supportsDigitalRelease: true,
      supportsOAuth: true,
      catalogFeatures: ['trending', 'popular', 'topRated', 'search', 'personalLists'],
    }),
  },
  {
    id: 'tvdb',
    name: 'TVDB',
    categories: ['metadata', 'artwork', 'catalog'],
    connectionState: 'coming_soon',
    requiresCredential: true,
    requiresOAuth: false,
    capabilities: metadataBase({
      mediaTypes: ['series', 'anime'],
      metadataFields: ['title', 'description', 'poster', 'background', 'logo', 'episodes', 'externalIds'],
    }),
  },
  {
    id: 'fanart',
    name: 'Fanart.tv',
    categories: ['artwork'],
    connectionState: 'not_configured',
    requiresCredential: true,
    requiresOAuth: false,
    capabilities: metadataBase({
      metadataFields: ['poster', 'background', 'logo'],
      catalogFeatures: [],
      supportsSearch: false,
      supportsPagination: false,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'rpdb',
    name: 'RPDB',
    categories: ['artwork'],
    connectionState: 'not_configured',
    requiresCredential: true,
    requiresOAuth: false,
    capabilities: metadataBase({
      metadataFields: ['poster'],
      catalogFeatures: [],
      supportsSearch: false,
      supportsPagination: false,
      supportsAgeRating: false,
      supportsRegion: false,
      supportsLanguage: false,
    }),
  },
  {
    id: 'trakt',
    name: 'Trakt',
    categories: ['tracking', 'catalog', 'ratings'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: true,
    capabilities: metadataBase({
      metadataFields: ['rating', 'externalIds'],
      catalogFeatures: ['personalLists', 'recommendations', 'trending'],
      supportsTracking: true,
      supportsOAuth: true,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'mdblist',
    name: 'MDBList',
    categories: ['catalog', 'ratings'],
    connectionState: 'not_configured',
    requiresCredential: true,
    requiresOAuth: false,
    capabilities: metadataBase({
      metadataFields: ['rating', 'externalIds'],
      catalogFeatures: ['personalLists', 'topRated'],
      supportsAgeRating: false,
    }),
  },
  {
    id: 'imdb',
    name: 'IMDb',
    categories: ['ratings'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: false,
    capabilities: metadataBase({
      metadataFields: ['rating', 'externalIds'],
      catalogFeatures: [],
      supportsSearch: false,
      supportsPagination: false,
      supportsRegion: false,
      supportsLanguage: false,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'anilist',
    name: 'AniList',
    categories: ['metadata', 'catalog', 'tracking'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: true,
    capabilities: metadataBase({
      mediaTypes: ['anime', 'movie', 'series'],
      catalogFeatures: ['trending', 'popular', 'topRated', 'search', 'personalLists'],
      supportsTracking: true,
      supportsOAuth: true,
      supportsRegion: false,
      supportsLanguage: false,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'mal',
    name: 'MyAnimeList',
    categories: ['metadata', 'catalog', 'tracking'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: true,
    capabilities: metadataBase({
      mediaTypes: ['anime'],
      catalogFeatures: ['trending', 'popular', 'topRated', 'search', 'personalLists'],
      supportsTracking: true,
      supportsOAuth: true,
      supportsRegion: false,
      supportsLanguage: false,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'kitsu',
    name: 'Kitsu',
    categories: ['metadata', 'catalog', 'tracking'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: true,
    capabilities: metadataBase({
      mediaTypes: ['anime'],
      catalogFeatures: ['trending', 'popular', 'topRated', 'search'],
      supportsTracking: true,
      supportsOAuth: true,
      supportsRegion: false,
      supportsLanguage: false,
      supportsAgeRating: false,
    }),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    categories: ['ai'],
    connectionState: 'not_configured',
    requiresCredential: true,
    requiresOAuth: false,
    capabilities: metadataBase({
      mediaTypes: ['movie', 'series', 'anime'],
      metadataFields: [],
      catalogFeatures: ['search'],
      supportsPagination: false,
      supportsRegion: false,
      supportsAgeRating: false,
    }),
  },
];

export function listProviders(): ProviderDefinition[] {
  return PROVIDER_REGISTRY;
}

export function getProvider(id: string): ProviderDefinition | undefined {
  return PROVIDER_REGISTRY.find((provider) => provider.id === id);
}

export function listProvidersByCategory(
  category: ProviderDefinition['categories'][number],
): ProviderDefinition[] {
  return PROVIDER_REGISTRY.filter((provider) => provider.categories.includes(category));
}
