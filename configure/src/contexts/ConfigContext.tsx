import { createContext, useContext, useState } from "react";
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

  return (
    <ConfigContext.Provider
      value={{
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
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);

  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }

  return context;
} 