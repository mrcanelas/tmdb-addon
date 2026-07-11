export {
  METALAYER_CONFIG_VERSION,
  MetaLayerConfigSchema,
  LocalizationPreferencesSchema,
  CatalogDefinitionSchema,
  createDefaultMetaLayerConfig,
  parseMetaLayerConfig,
  type MetaLayerConfig,
  type LocalizationPreferences,
  type CatalogDefinition,
} from './schema.js';

export {
  LegacyAddonConfigSchema,
  parseLegacyAddonConfig,
  listLegacySecretsPresent,
  LEGACY_SECRET_KEYS,
  type LegacyAddonConfig,
} from './legacy.js';

export {
  LegacyManifestSchema,
  EmptyCatalogResponseSchema,
  assertEmptyCatalogResponse,
  type LegacyManifest,
} from './stremio-contracts.js';
