export {
  METALAYER_CONFIG_VERSION,
  MetaLayerConfigSchema,
  LocalizationPreferencesSchema,
  IdentityPreferencesSchema,
  CatalogDefinitionSchema,
  createDefaultMetaLayerConfig,
  parseMetaLayerConfig,
  type MetaLayerConfig,
  type LocalizationPreferences,
  type IdentityPreferences,
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
  parseLegacyImportSource,
  planLegacyImport,
  toPublicImportPlan,
  type LegacyImportAttentionItem,
  type LegacyImportReport,
  type LegacyImportPlan,
} from './legacy-import.js';

export {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from './lz-string.js';

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
