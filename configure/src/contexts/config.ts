import { createContext } from 'react';

export type CatalogConfig = {
  id: string;
  type: string;
  name?: string;
  showInHome: boolean;
};

export type ConfigContextType = {
  rpdbkey: string;
  mdblistkey: string;
  includeAdult: boolean;
  provideImdbId: boolean;
  tmdbPrefix: boolean;
  language: string;
  sessionId: string;
  streaming: string[];
  catalogs: CatalogConfig[];
  ageRating: string | undefined;
  searchEnabled: boolean;
  setRpdbkey: (rpdbkey: string) => void;
  setMdblistkey: (mdblistkey: string) => void;
  setIncludeAdult: (includeAdult: boolean) => void;
  setProvideImdbId: (provideImdbId: boolean) => void;
  setTmdbPrefix: (tmdbPrefix: boolean) => void;
  setLanguage: (language: string) => void;
  setSessionId: (sessionId: string) => void;
  setStreaming: (streaming: string[]) => void;
  setCatalogs: (catalogs: CatalogConfig[]) => void;
  setAgeRating: (ageRating: string | undefined) => void;
  setSearchEnabled: (enabled: boolean) => void;
  loadConfigFromUrl: () => void;
};

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined); 