import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigContext, type ConfigContextType, type CatalogConfig } from "./config";
import { 
  baseCatalogs, 
  authCatalogs, 
  mdblistCatalogs, 
  streamingCatalogs 
} from "@/data/catalogs";

// Combina todos os catálogos em uma única lista
const allCatalogs = [
  ...baseCatalogs,
  ...authCatalogs,
  ...mdblistCatalogs,
  ...Object.values(streamingCatalogs).flat()
];

// Catálogos que devem ser habilitados por padrão
const defaultCatalogIds = [
  'tmdb.top',
  'tmdb.year',
  'tmdb.language',
  'tmdb.trending'
];

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [rpdbkey, setRpdbkey] = useState("");
  const [mdblistkey, setMdblistkey] = useState("");
  const [includeAdult, setIncludeAdult] = useState(false);
  const [provideImdbId, setProvideImdbId] = useState(false);
  const [tmdbPrefix, setTmdbPrefix] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [sessionId, setSessionId] = useState("");
  const [streaming, setStreaming] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogConfig[]>([]);
  const [ageRating, setAgeRating] = useState<string | undefined>(undefined);
  const [searchEnabled, setSearchEnabled] = useState<boolean>(true);

  // Função para carregar os catálogos padrão
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
      const decodedConfig = decodeURIComponent(path);
      const config = JSON.parse(decodedConfig);
      
      if (config.rpdbkey) setRpdbkey(config.rpdbkey);
      if (config.includeAdult) setIncludeAdult(config.includeAdult === "true");
      if (config.language) setLanguage(config.language);
      
      // Adiciona os nomes aos catálogos usando a lista completa
      if (config.catalogs) {
        const catalogsWithNames = config.catalogs.map(catalog => {
          const existingCatalog = allCatalogs.find(
            c => c.id === catalog.id && c.type === catalog.type
          );
          return {
            ...catalog,
            name: existingCatalog?.name || catalog.id
          };
        });
        setCatalogs(catalogsWithNames);

        // Extrai os serviços de streaming dos catálogos selecionados
        const selectedStreamingServices = new Set(
          catalogsWithNames
            .filter(catalog => catalog.id.startsWith('streaming.'))
            .map(catalog => catalog.id.split('.')[1])
        );

        setStreaming(Array.from(selectedStreamingServices) as string[]);
      } else {
        loadDefaultCatalogs(); // Carrega catálogos padrão se não houver na URL
      }
      
      if (config.searchEnabled) setSearchEnabled(config.searchEnabled === "true");
      
      window.history.replaceState({}, '', '/configure');
    } catch (error) {
      console.error('Error loading config from URL:', error);
      loadDefaultCatalogs(); // Carrega catálogos padrão em caso de erro
    }
  };

  // Carrega as configurações da URL quando o componente montar
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
    mdblistkey,
    includeAdult,
    provideImdbId,
    tmdbPrefix,
    language,
    sessionId,
    streaming,
    catalogs,
    ageRating,
    searchEnabled,
    setRpdbkey,
    setMdblistkey,
    setIncludeAdult,
    setProvideImdbId,
    setTmdbPrefix,
    setLanguage,
    setSessionId,
    setStreaming,
    setCatalogs,
    setAgeRating,
    setSearchEnabled,
    loadConfigFromUrl
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext); 