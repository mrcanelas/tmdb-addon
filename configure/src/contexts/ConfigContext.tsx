import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigContext, type ConfigContextType, type CatalogConfig } from "./config";

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

  const loadConfigFromUrl = () => {
    try {
      // Pega o primeiro segmento da URL após o domínio
      const path = window.location.pathname.split('/')[1];
      
      // Decodifica a URL
      const decodedConfig = decodeURIComponent(path);
      
      // Parse do JSON
      const config = JSON.parse(decodedConfig);
      
      // Atualiza os estados com as configurações da URL
      if (config.rpdbkey) setRpdbkey(config.rpdbkey);
      if (config.includeAdult) setIncludeAdult(config.includeAdult === "true");
      if (config.language) setLanguage(config.language);
      if (config.streaming) setStreaming(config.streaming);
      if (config.catalogs) setCatalogs(config.catalogs);
      
      // Remove as configurações da URL sem recarregar a página
      window.history.replaceState({}, '', '/configure');
    } catch (error) {
      console.error('Error loading config from URL:', error);
    }
  };

  // Carrega as configurações da URL quando o componente montar
  useEffect(() => {
    loadConfigFromUrl();
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
    setRpdbkey,
    setMdblistkey,
    setIncludeAdult,
    setProvideImdbId,
    setTmdbPrefix,
    setLanguage,
    setSessionId,
    setStreaming,
    setCatalogs,
    loadConfigFromUrl
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext); 