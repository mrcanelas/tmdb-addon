import { compressToEncodedURIComponent } from 'lz-string';

interface AddonConfig {
  rpdbkey?: string;
  geminikey?: string;
  mdblistkey?: string;
  includeAdult?: boolean;
  provideImdbId?: boolean;
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
}

export function generateAddonUrl(config: AddonConfig): string {
  const configToEncode = {
    ...config,
    rpdbkey: config.rpdbkey || undefined,
    geminikey: config.geminikey || undefined,
    mdblistkey: config.mdblistkey || undefined,
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
    tmdbPrefix: config.tmdbPrefix === true ? "true" : undefined,
    hideEpisodeThumbnails: config.hideEpisodeThumbnails === true ? "true" : undefined,
    searchEnabled: config.searchEnabled === false ? "false" : undefined,
    hideInCinemaTag: config.hideInCinemaTag === true ? "true" : undefined,
    castCount: typeof config.castCount === "number" ? config.castCount : undefined,
    showAgeRatingInGenres: config.showAgeRatingInGenres === true ? "true" : undefined,
  };

  const cleanConfig = Object.fromEntries(
    Object.entries(configToEncode).filter(([_, value]) => value !== undefined && value !== null)
  );

  const compressed = compressToEncodedURIComponent(JSON.stringify(cleanConfig));

  return `${window.location.origin}/${compressed}/manifest.json`;
}