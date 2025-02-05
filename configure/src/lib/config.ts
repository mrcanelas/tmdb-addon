interface AddonConfig {
  rpdbkey?: string;
  mdblistkey?: string;
  includeAdult?: boolean;
  provideImdbId?: boolean;
  tmdbPrefix?: boolean;
  language?: string;
  sessionId?: string;
  catalogs?: Array<{
    id: string;
    type: string;
    enabled: boolean;
    showInHome: boolean;
  }>;
}

export function generateAddonUrl(config: AddonConfig): string {
  // Criar um novo objeto apenas com os valores necessários
  const configToEncode = {
    ...config,
    // Remove os itens se forem nulos/vazios
    rpdbkey: config.rpdbkey || undefined,
    mdblistkey: config.mdblistkey || undefined,
    sessionId: config.sessionId || undefined,
    // Filtra apenas catálogos habilitados
    catalogs: config.catalogs?.filter(c => c.enabled).map(({ id, type, showInHome }) => ({
      id,
      type,
      showInHome
    })) || undefined,
    // Converte booleanos para strings
    includeAdult: config.includeAdult === true ? "true" : undefined,
    provideImdbId: config.provideImdbId === true ? "true" : undefined,
    tmdbPrefix: config.tmdbPrefix === true ? "true" : undefined
  };

  // Remover propriedades undefined/null
  const cleanConfig = Object.fromEntries(
    Object.entries(configToEncode).filter(([_, value]) => value !== undefined && value !== null)
  );

  // Converter o objeto em string e codificar para URL
  const encodedConfig = encodeURIComponent(JSON.stringify(cleanConfig));
  
  return `${window.location.origin}/${encodedConfig}/manifest.json`;
}