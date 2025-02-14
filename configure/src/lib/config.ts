interface AddonConfig {
  rpdbkey?: string;
  mdblistkey?: string;
  includeAdult?: boolean;
  provideImdbId?: boolean;
  tmdbPrefix?: boolean;
  language?: string;
  sessionId?: string;
  ageRating?: string;
  searchEnabled?: boolean;
  catalogs?: Array<{
    id: string;
    type: string;
    enabled: boolean;
    showInHome: boolean;
  }>;
}

export function generateAddonUrl(config: AddonConfig): string {
  const configToEncode = {
    ...config,
    rpdbkey: config.rpdbkey || undefined,
    mdblistkey: config.mdblistkey || undefined,
    sessionId: config.sessionId || undefined,
    catalogs: config.catalogs?.filter(c => c.enabled).map(({ id, type, showInHome }) => ({
      id,
      type,
      showInHome
    })) || undefined,
    includeAdult: config.includeAdult === true ? "true" : undefined,
    provideImdbId: config.provideImdbId === true ? "true" : undefined,
    tmdbPrefix: config.tmdbPrefix === true ? "true" : undefined,
    searchEnabled: config.searchEnabled === false ? "false" : undefined,
  };

  // Remover propriedades undefined/null
  const cleanConfig = Object.fromEntries(
    Object.entries(configToEncode).filter(([_, value]) => value !== undefined && value !== null)
  );

  // Converter o objeto em string e codificar para URL
  const encodedConfig = encodeURIComponent(JSON.stringify(cleanConfig));
  
  return `${window.location.origin}/${encodedConfig}/manifest.json`;
}