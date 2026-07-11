import { z } from 'zod';

/**
 * MetaLayer configuration schema version.
 * Increment with every incompatible stored-config change and add a migration.
 */
export const METALAYER_CONFIG_VERSION = 1 as const;

export const LocalizationPreferencesSchema = z.object({
  interfaceLocale: z.string().min(2),
  metadataLocale: z.string().min(2),
  metadataFallbackLocales: z.array(z.string().min(2)).default([]),
  titleMode: z
    .enum(['localized', 'original', 'localized-with-original', 'original-with-localized'])
    .default('localized'),
  descriptionMode: z.enum(['localized', 'original', 'best-available']).default('localized'),
  contentRegion: z.string().length(2),
  availabilityRegion: z.string().length(2).optional(),
  certificationRegion: z.string().length(2).optional(),
  releaseRegion: z.string().length(2).optional(),
  timezone: z.string().min(1).default('UTC'),
});

export const CatalogDefinitionSchema = z.object({
  instanceId: z.string().min(1),
  provider: z.string().min(1),
  providerCatalogId: z.string().min(1),
  mediaType: z.enum(['movie', 'series', 'anime']),
  originalName: z.string().min(1),
  customName: z.string().optional(),
  name: z
    .object({
      default: z.string().min(1),
      values: z.record(z.string()).optional(),
    })
    .optional(),
  enabled: z.boolean().default(true),
  showInHome: z.boolean().default(true),
  position: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});

/** ADR 0006 — public Stremio ids default to IMDb when available. */
export const IdentityPreferencesSchema = z.object({
  stremioPublicId: z.enum(['imdb', 'tmdb']).default('imdb'),
});

export const MetaLayerConfigSchema = z.object({
  configVersion: z.literal(METALAYER_CONFIG_VERSION),
  name: z.string().min(1),
  localization: LocalizationPreferencesSchema,
  identity: IdentityPreferencesSchema.default({ stremioPublicId: 'imdb' }),
  catalogs: z.array(CatalogDefinitionSchema).default([]),
  featureFlags: z.record(z.boolean()).default({}),
  legacyImport: z
    .object({
      source: z.literal('tmdb-addon'),
      importedAt: z.string().datetime(),
      ageRating: z.string().optional(),
      castCount: z.number().optional(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LocalizationPreferences = z.infer<typeof LocalizationPreferencesSchema>;
export type IdentityPreferences = z.infer<typeof IdentityPreferencesSchema>;
export type CatalogDefinition = z.infer<typeof CatalogDefinitionSchema>;
export type MetaLayerConfig = z.infer<typeof MetaLayerConfigSchema>;

export function createDefaultMetaLayerConfig(
  overrides: Partial<MetaLayerConfig> = {},
): MetaLayerConfig {
  const now = new Date().toISOString();
  return MetaLayerConfigSchema.parse({
    configVersion: METALAYER_CONFIG_VERSION,
    name: 'Default',
    localization: {
      interfaceLocale: 'en-US',
      metadataLocale: 'en-US',
      metadataFallbackLocales: [],
      titleMode: 'localized',
      descriptionMode: 'localized',
      contentRegion: 'US',
      timezone: 'UTC',
    },
    identity: {
      stremioPublicId: 'imdb',
    },
    catalogs: [],
    featureFlags: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function parseMetaLayerConfig(input: unknown): MetaLayerConfig {
  return MetaLayerConfigSchema.parse(input);
}
