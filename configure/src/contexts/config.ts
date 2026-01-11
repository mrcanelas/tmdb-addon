import { createContext } from 'react';

export type CatalogConfig = {
  id: string;
  type: string;
  name?: string;
  showInHome: boolean;
  enabled: boolean;
};

export type RPDBMediaTypes = {
  poster: boolean;
  logo: boolean;
  backdrop: boolean;
};

export type ConfigContextType = {
  rpdbkey: string;
  rpdbMediaTypes: RPDBMediaTypes;
  topPostersKey: string;
  geminikey: string;
  groqkey: string;
  mdblistkey: string;
  traktAccessToken: string;
  traktRefreshToken: string;
  tmdbApiKey: string;
  includeAdult: boolean;
  provideImdbId: boolean;
  returnImdbId: boolean;
  tmdbPrefix: boolean;
  hideEpisodeThumbnails: boolean;
  language: string;
  sessionId: string;
  streaming: string[];
  catalogs: CatalogConfig[];
  ageRating: string | undefined;
  searchEnabled: boolean;
  hideInCinemaTag: boolean;
  castCount: number | undefined;
  showAgeRatingInGenres: boolean;
  enableAgeRating: boolean;
  showAgeRatingWithImdbRating: boolean;
  strictRegionFilter: boolean;
  digitalReleaseFilter: boolean;
  replaceCinemeta: boolean;
  setRpdbkey: (rpdbkey: string) => void;
  setRpdbMediaTypes: (types: RPDBMediaTypes) => void;
  setTopPostersKey: (key: string) => void;
  setGeminiKey: (geminikey: string) => void;
  setGroqKey: (groqkey: string) => void;
  setMdblistkey: (mdblistkey: string) => void;
  setTraktAccessToken: (traktAccessToken: string) => void;
  setTraktRefreshToken: (traktRefreshToken: string) => void;
  setTmdbApiKey: (tmdbApiKey: string) => void;
  setIncludeAdult: (includeAdult: boolean) => void;
  setProvideImdbId: (provideImdbId: boolean) => void;
  setReturnImdbId: (returnImdbId: boolean) => void;
  setTmdbPrefix: (tmdbPrefix: boolean) => void;
  setHideEpisodeThumbnails: (hideEpisodeThumbnails: boolean) => void;
  setLanguage: (language: string) => void;
  setSessionId: (sessionId: string) => void;
  setStreaming: (streaming: string[]) => void;
  setCatalogs: (catalogs: CatalogConfig[] | ((prev: CatalogConfig[]) => CatalogConfig[])) => void;
  setAgeRating: (ageRating: string | undefined) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setHideInCinemaTag: (hide: boolean) => void;
  setCastCount: (count: number | undefined) => void;
  setShowAgeRatingInGenres: (show: boolean) => void;
  setEnableAgeRating: (enable: boolean) => void;
  setShowAgeRatingWithImdbRating: (show: boolean) => void;
  setStrictRegionFilter: (enable: boolean) => void;
  setDigitalReleaseFilter: (enable: boolean) => void;
  setReplaceCinemeta: (enable: boolean) => void;
  loadConfigFromUrl: () => void;
  saveConfigToStorage: () => void;
};

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined); 