import { createContext } from 'react';

export interface CatalogConfig {
  id: string;
  type: "movie" | "series";
  enabled: boolean;
  showInHome: boolean;
}

export interface ConfigContextType {
  rpdbkey: string;
  includeAdult: boolean;
  provideImdbId: boolean;
  tmdbPrefix: boolean;
  language: string;
  sessionId: string;
  streaming: string[];
  catalogs: CatalogConfig[];
  setRpdbkey: (value: string) => void;
  setIncludeAdult: (value: boolean) => void;
  setProvideImdbId: (value: boolean) => void;
  setTmdbPrefix: (value: boolean) => void;
  setLanguage: (value: string) => void;
  setSessionId: (value: string) => void;
  setStreaming: (value: string[]) => void;
  setCatalogs: (value: CatalogConfig[] | ((prev: CatalogConfig[]) => CatalogConfig[])) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined); 