import { toManifestCatalogEntries } from '@metalayer/catalogs';
import type { MetaLayerConfig } from '@metalayer/config';

export interface ManifestIdentity {
  manifestId: string;
  manifestName: string;
  version: string;
}

export function buildStremioManifest(
  config: MetaLayerConfig,
  identity: ManifestIdentity,
  description: string,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize;
  const catalogs = toManifestCatalogEntries(
    config.catalogs,
    config.localization.metadataLocale,
    config.presentation,
  ).map(({ id, type, name }) => ({
    id,
    type,
    name,
    ...(pageSize !== undefined ? { pageSize } : {}),
    extra: [{ name: 'skip', isRequired: false }],
  }));

  const types = [...new Set(catalogs.map((catalog) => catalog.type))];

  return {
    id: identity.manifestId,
    version: identity.version,
    name: identity.manifestName,
    description,
    resources: catalogs.length > 0 ? ['catalog', 'meta'] : ['meta'],
    types: types.length > 0 ? types : ['movie', 'series'],
    idPrefixes: ['tt', 'tmdb:', 'anilist:'],
    catalogs,
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
  };
}
