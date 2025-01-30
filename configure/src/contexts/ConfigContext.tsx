import { createContext, useContext, useState, useEffect } from "react";
import { ConfigContext, type ConfigContextType, type CatalogConfig } from "./config";

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [rpdbkey, setRpdbkey] = useState(() => {
    return localStorage.getItem("rpdbkey") || "";
  });

  const [includeAdult, setIncludeAdult] = useState(() => {
    return localStorage.getItem("includeAdult") === "true";
  });

  const [provideImdbId, setProvideImdbId] = useState(() => {
    return localStorage.getItem("provideImdbId") === "true";
  });

  const [tmdbPrefix, setTmdbPrefix] = useState(() => {
    return localStorage.getItem("tmdbPrefix") === "true";
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "en-US";
  });

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("sessionId") || "";
  });

  const [streaming, setStreaming] = useState<string[]>(() => {
    const saved = localStorage.getItem("streaming");
    return saved ? JSON.parse(saved) : [];
  });

  const [catalogs, setCatalogs] = useState<CatalogConfig[]>(() => {
    const saved = localStorage.getItem("catalogs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("rpdbkey", rpdbkey);
  }, [rpdbkey]);

  useEffect(() => {
    localStorage.setItem("includeAdult", String(includeAdult));
  }, [includeAdult]);

  useEffect(() => {
    localStorage.setItem("provideImdbId", String(provideImdbId));
  }, [provideImdbId]);

  useEffect(() => {
    localStorage.setItem("tmdbPrefix", String(tmdbPrefix));
  }, [tmdbPrefix]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("sessionId", sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem("streaming", JSON.stringify(streaming));
  }, [streaming]);

  useEffect(() => {
    localStorage.setItem("catalogs", JSON.stringify(catalogs));
  }, [catalogs]);

  return (
    <ConfigContext.Provider
      value={{
        rpdbkey,
        includeAdult,
        provideImdbId,
        tmdbPrefix,
        language,
        sessionId,
        streaming,
        catalogs,
        setRpdbkey,
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