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

export const MergeSourceSchema = z.object({
  instanceId: z.string().min(1),
  weight: z.number().positive().optional(),
});

export const MergeDefinitionSchema = z.object({
  mode: z.enum([
    'append',
    'interleave',
    'dedupe-union',
    'weighted-mix',
    'priority-fallback',
  ]),
  sources: z.array(MergeSourceSchema).min(2),
});

export const RotationDefinitionSchema = z.object({
  mode: z.enum(['hourly', 'daily', 'weekly']),
  sources: z.array(z.string().min(1)).min(2),
});

export const RuleContextSchema = z.enum([
  'global',
  'profile',
  'catalog',
  'home',
  'search',
  'recommendations',
]);

/** Initial RuleSet subset (AGENTS.md §13.6) — independently evaluable. */
export const RuleSetSchema = z.object({
  includeGenres: z.array(z.string()).optional(),
  requireGenres: z.array(z.string()).optional(),
  excludeGenres: z.array(z.string()).optional(),
  preferGenres: z.array(z.string()).optional(),

  minimumRating: z.number().min(0).max(10).optional(),
  minimumVotes: z.number().int().nonnegative().optional(),

  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),

  runtimeMin: z.number().int().nonnegative().optional(),
  runtimeMax: z.number().int().nonnegative().optional(),

  originalLanguages: z.array(z.string()).optional(),
  productionCountries: z.array(z.string()).optional(),

  includeNetworks: z.array(z.string()).optional(),
  excludeNetworks: z.array(z.string()).optional(),

  releasedOnly: z.boolean().optional(),
  digitallyReleasedOnly: z.boolean().optional(),
  availableInRegion: z.string().length(2).optional(),

  excludeAdult: z.boolean().optional(),
  maximumCertification: z.string().optional(),

  hideWatched: z.boolean().optional(),
  requireArtwork: z.boolean().optional(),
  hideSpecials: z.boolean().optional(),
});

export const SortingFieldSchema = z.enum([
  'sourceOrder',
  'title',
  'originalTitle',
  'rating',
  'voteCount',
  'releaseDate',
  'popularity',
  'runtime',
  'random',
]);

export const SortingCriterionSchema = z.object({
  field: SortingFieldSchema,
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const SortingPlanSchema = z.object({
  criteria: z.array(SortingCriterionSchema).default([]),
  stable: z.boolean().default(true),
  randomSeedWindow: z.enum(['request', 'hour', 'day', 'week']).optional(),
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
  /** Optional studio grouping label (not a separate order list). */
  group: z.string().min(1).optional(),
  merge: MergeDefinitionSchema.optional(),
  rotation: RotationDefinitionSchema.optional(),
  rules: RuleSetSchema.optional(),
  sorting: SortingPlanSchema.optional(),
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
  globalRules: RuleSetSchema.default({}),
  globalSorting: SortingPlanSchema.optional(),
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
export type MergeDefinition = z.infer<typeof MergeDefinitionSchema>;
export type RotationDefinition = z.infer<typeof RotationDefinitionSchema>;
export type RuleContext = z.infer<typeof RuleContextSchema>;
export type RuleSet = z.infer<typeof RuleSetSchema>;
export type SortingField = z.infer<typeof SortingFieldSchema>;
export type SortingCriterion = z.infer<typeof SortingCriterionSchema>;
export type SortingPlan = z.infer<typeof SortingPlanSchema>;
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
    globalRules: {},
    featureFlags: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function parseMetaLayerConfig(input: unknown): MetaLayerConfig {
  return MetaLayerConfigSchema.parse(input);
}
