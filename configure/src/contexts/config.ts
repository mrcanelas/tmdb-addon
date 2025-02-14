import { createContext } from 'react';

export type CatalogConfig = {
  id: string;
  type: string;
  name?: string;
  showInHome: boolean;
};

export interface ConfigContextType {
  rpdbkey: string;
  mdblistkey: string;
  includeAdult: boolean;
  provideImdbId: boolean;
  tmdbPrefix: boolean;
  language: string;
  sessionId: string;
  streaming: string[];
  catalogs: CatalogConfig[];
  ageRating: string;
  setRpdbkey: (value: string) => void;
  setMdblistkey: (value: string) => void;
  setIncludeAdult: (value: boolean) => void;
  setProvideImdbId: (value: boolean) => void;
  setTmdbPrefix: (value: boolean) => void;
  setLanguage: (value: string) => void;
  setSessionId: (value: string) => void;
  setStreaming: (value: string[]) => void;
  setCatalogs: (value: CatalogConfig[] | ((prev: CatalogConfig[]) => CatalogConfig[])) => void;
  setAgeRating: (value: string) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined); 