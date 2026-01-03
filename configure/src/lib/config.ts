import { compressToEncodedURIComponent } from 'lz-string';
import type { RPDBMediaTypes } from '@/contexts/config';

interface AddonConfig {
  rpdbkey?: string;
  rpdbMediaTypes?: RPDBMediaTypes;
  geminikey?: string;
  mdblistkey?: string;
  traktAccessToken?: string;
  traktRefreshToken?: string;
  tmdbApiKey?: string;
  includeAdult?: boolean;
  provideImdbId?: boolean;
  returnImdbId?: boolean;
  tmdbPrefix?: boolean;
  hideEpisodeThumbnails?: boolean;
  language?: string;
  sessionId?: string;
  ageRating?: string;
  searchEnabled?: boolean;
  catalogs?: Array<{
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    showInHome: boolean;
  }>;
  hideInCinemaTag?: boolean;
  castCount?: number;
  showAgeRatingInGenres?: boolean;
  enableAgeRating?: boolean;
  showAgeRatingWithImdbRating?: boolean;
  strictRegionFilter?: boolean;
}

export function generateAddonUrl(config: AddonConfig): string {
  const configToEncode = {
    ...config,
    rpdbkey: config.rpdbkey || undefined,
    rpdbMediaTypes: config.rpdbMediaTypes || undefined,
    geminikey: config.geminikey || undefined,
    mdblistkey: config.mdblistkey || undefined,
    traktAccessToken: config.traktAccessToken || undefined,
    traktRefreshToken: config.traktRefreshToken || undefined,
    tmdbApiKey: config.tmdbApiKey || undefined,
    sessionId: config.sessionId || undefined,
    catalogs: config.catalogs
      ?.filter(catalog => catalog.enabled === false ? false : true)
      .map(({ id, type, name, showInHome }) => ({
        id,
        type,
        name,
        showInHome
      })),
    includeAdult: config.includeAdult === true ? "true" : undefined,
    provideImdbId: config.provideImdbId === true ? "true" : undefined,
    returnImdbId: config.returnImdbId === true ? "true" : undefined,
    tmdbPrefix: config.tmdbPrefix === true ? "true" : undefined,
    hideEpisodeThumbnails: config.hideEpisodeThumbnails === true ? "true" : undefined,
    searchEnabled: config.searchEnabled === false ? "false" : undefined,
    hideInCinemaTag: config.hideInCinemaTag === true ? "true" : undefined,
    castCount: typeof config.castCount === "number" ? config.castCount : undefined,
    enableAgeRating: typeof config.enableAgeRating === "boolean" ? String(config.enableAgeRating) : undefined,
    showAgeRatingInGenres: typeof config.showAgeRatingInGenres === "boolean" ? String(config.showAgeRatingInGenres) : undefined,
    showAgeRatingWithImdbRating: typeof config.showAgeRatingWithImdbRating === "boolean" ? String(config.showAgeRatingWithImdbRating) : undefined,
    strictRegionFilter: typeof config.strictRegionFilter === "boolean" ? String(config.strictRegionFilter) : undefined,
  };

  const cleanConfig = Object.fromEntries(
    Object.entries(configToEncode).filter(([_, value]) => value !== undefined && value !== null)
  );

  const compressed = compressToEncodedURIComponent(JSON.stringify(cleanConfig));

  return `${window.location.origin}/${compressed}/manifest.json`;
}