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
  CatalogResponseSchema,
  EmptyCatalogResponseSchema,
  assertEmptyCatalogResponse,
  LegacySyntheticEmptyMetaSchema,
  LegacySyntheticEmptyCatalogSchema,
  MetaResponseSchema,
  assertNotFakeErrorCatalog,
  type LegacyManifest,
  type CatalogResponse,
  type MetaResponse,
} from './stremio-contracts.js';
