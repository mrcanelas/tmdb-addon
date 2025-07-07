import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigContext, type ConfigContextType, type CatalogConfig } from "./config";
import { 
  baseCatalogs, 
  authCatalogs, 
  streamingCatalogs 
} from "@/data/catalogs";
import { decompressFromEncodedURIComponent } from 'lz-string';

const allCatalogs = [
  ...baseCatalogs,
  ...authCatalogs,
  ...Object.values(streamingCatalogs).flat()
];

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [rpdbkey, setRpdbkey] = useState("");
  const [geminikey, setGeminiKey] = useState("");
  const [mdblistkey, setMdblistkey] = useState("");
  const [includeAdult, setIncludeAdult] = useState(false);
  const [provideImdbId, setProvideImdbId] = useState(false);
  const [tmdbPrefix, setTmdbPrefix] = useState(false);
  const [hideEpisodeThumbnails, setHideEpisodeThumbnails] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [sessionId, setSessionId] = useState("");
  const [streaming, setStreaming] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogConfig[]>([]);
  const [ageRating, setAgeRating] = useState<string | undefined>(undefined);
  const [searchEnabled, setSearchEnabled] = useState<boolean>(true);
  const [hideInCinemaTag, setHideInCinemaTag] = useState(false);
  const [castCount, setCastCount] = useState<number | undefined>(5);

  const loadDefaultCatalogs = () => {
    const defaultCatalogs = baseCatalogs.map(catalog => ({
      ...catalog,
      enabled: true,
      showInHome: true
    }));
    setCatalogs(defaultCatalogs);
  };

  const loadConfigFromUrl = () => {
    try {
      const path = window.location.pathname.split('/')[1];
      const decompressedConfig = decompressFromEncodedURIComponent(path);
      const config = JSON.parse(decompressedConfig);
      
      if (config.rpdbkey) setRpdbkey(config.rpdbkey);
      if (config.mdblistkey) setMdblistkey(config.mdblistkey);
      if (config.geminikey) setGeminiKey(config.geminikey);
      if (config.provideImdbId) setProvideImdbId(config.provideImdbId === "true");
      if (config.tmdbPrefix) setTmdbPrefix(config.tmdbPrefix === "true");
      if (config.hideEpisodeThumbnails) setHideEpisodeThumbnails(config.hideEpisodeThumbnails === "true");
      if (config.sessionId) setSessionId(config.sessionId);
      if (config.ageRating) setAgeRating(config.ageRating);
      if (config.includeAdult) setIncludeAdult(config.includeAdult === "true");
      if (config.language) setLanguage(config.language);
      if (config.hideInCinemaTag) setHideInCinemaTag(config.hideInCinemaTag === "true" || config.hideInCinemaTag === true);
      if (config.castCount !== undefined) setCastCount(config.castCount === "Unlimited" ? undefined : Number(config.castCount));
      
      if (config.catalogs) {
        const catalogsWithNames = config.catalogs.map(catalog => {
          const existingCatalog = allCatalogs.find(
            c => c.id === catalog.id && c.type === catalog.type
          );
          return {
            ...catalog,
            name: existingCatalog?.name || catalog.id,
            enabled: catalog.enabled !== undefined ? catalog.enabled : true 
          };
        });
        setCatalogs(catalogsWithNames);

        const selectedStreamingServices = new Set(
          catalogsWithNames
            .filter(catalog => catalog.id.startsWith('streaming.'))
            .map(catalog => catalog.id.split('.')[1])
        );

        setStreaming(Array.from(selectedStreamingServices) as string[]);
      } else {
        loadDefaultCatalogs(); 
      }
      
      if (config.searchEnabled) setSearchEnabled(config.searchEnabled === "true");
      
      window.history.replaceState({}, '', '/configure');
    } catch (error) {
      console.error('Error loading config from URL:', error);
      loadDefaultCatalogs(); 
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('configure')) {
      loadConfigFromUrl();
    } else {
      loadDefaultCatalogs();
    }
  }, []);

  const value = {
    rpdbkey,
    geminikey,
    mdblistkey,
    includeAdult,
    provideImdbId,
    tmdbPrefix,
    hideEpisodeThumbnails,
    language,
    sessionId,
    streaming,
    catalogs,
    ageRating,
    searchEnabled,
    hideInCinemaTag,
    castCount,
    setRpdbkey,
    setGeminiKey,
    setMdblistkey,
    setIncludeAdult,
    setProvideImdbId,
    setTmdbPrefix,
    setHideEpisodeThumbnails,
    setLanguage,
    setSessionId,
    setStreaming,
    setCatalogs,
    setAgeRating,
    setSearchEnabled,
    setHideInCinemaTag,
    setCastCount,
    loadConfigFromUrl
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext); 