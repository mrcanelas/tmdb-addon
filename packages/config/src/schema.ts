import { z } from 'zod';
import {
  DEFAULT_PRESENTATION,
  PresentationConfigSchema,
  type PresentationConfig,
} from './presentation.js';

/**
 * MetaLayer configuration schema version.
 * Increment with every incompatible stored-config change and add a migration.
 */
export const METALAYER_CONFIG_VERSION = 1 as const;

export {
  PresentationConfigSchema,
  DEFAULT_PRESENTATION,
  CATALOG_NAME_PREFIX,
  applyCatalogNamePrefix,
  parsePresentationConfig,
  type PresentationConfig,
} from './presentation.js';

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

  /** Case-insensitive substrings matched against title / overview / keywords. */
  excludeKeywords: z.array(z.string()).optional(),

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

/**
 * Pre-resolved catalog entry (AI Ranked List, imported static lists).
 * Stores public Stremio ids only — never provider credentials.
 */
export const StaticCatalogItemSchema = z.object({
  type: z.enum(['movie', 'series', 'anime']),
  /** Public Stremio id (`tt…`, `tmdb:…`, `anilist:…`). */
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int().optional(),
  poster: z.string().url().optional(),
});

export const CatalogDefinitionSchema = z.object({
  instanceId: z.string().min(1),
  provider: z.string().min(1),
  providerCatalogId: z.string().min(1),
  /** Materialized items served in order (AI ranked lists, static imports). */
  staticItems: z.array(StaticCatalogItemSchema).max(500).optional(),
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

/**
 * Native Stremio text search (AGENTS.md §16.1 / §13.8).
 * Search rules are isolated from catalog discovery rules.
 */
export const SearchPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  /** Optional rules applied only in the `search` context. */
  rules: RuleSetSchema.optional(),
});

export const DEFAULT_SEARCH_PREFERENCES = { enabled: true } as const;

/** ADR 0006 — public Stremio ids default to IMDb when available. */
export const IdentityPreferencesSchema = z.object({
  stremioPublicId: z.enum(['imdb', 'tmdb']).default('imdb'),
});

export const ResolvableFieldSchema = z.enum([
  'title',
  'originalTitle',
  'description',
  'poster',
  'background',
  'logo',
  'rating',
  'voteCount',
  'releaseDate',
  'externalIds',
  'episodes',
  'episodeOrder',
]);

export const DEFAULT_FIELD_PROVIDERS: Record<string, string[]> = {
  title: ['tmdb', 'imdb'],
  originalTitle: ['tmdb', 'imdb'],
  description: ['tmdb', 'imdb'],
  poster: ['rpdb', 'fanart', 'tmdb', 'imdb'],
  background: ['fanart', 'tmdb', 'imdb'],
  logo: ['rpdb', 'fanart', 'tmdb', 'tvdb', 'imdb'],
  rating: ['imdb', 'tmdb'],
  voteCount: ['tmdb'],
  releaseDate: ['tmdb', 'imdb'],
  externalIds: ['tmdb', 'imdb'],
  /** Episode structure (AGENTS.md §10.11). Anime defaults are overridden per media type. */
  episodes: ['tmdb', 'anilist', 'mal', 'kitsu'],
  episodeOrder: ['tmdb', 'anilist', 'mal', 'kitsu'],
};

/** Anime episode structure prefers anime-native providers (AGENTS.md §17). */
export const DEFAULT_ANIME_EPISODE_PROVIDERS: string[] = ['anilist', 'mal', 'kitsu', 'tmdb'];

/** Ordered provider chains per resolvable field (AGENTS.md §10.3). */
export const FieldProvidersSchema = z
  .record(z.array(z.string().min(1)).min(1))
  .default(DEFAULT_FIELD_PROVIDERS);

/**
 * Tracking providers selectable per profile (AGENTS.md §20 / §21.2).
 * Connection tokens remain in the Secret Vault — this only picks which provider
 * the profile prefers for watch-state / hide-watched style features.
 */
export const ProfileTrackingProviderSchema = z.enum([
  'trakt',
  'simkl',
  'anilist',
  'mal',
]);

/** Profile under one MetaLayer configuration (AGENTS.md §21). */
export const ProfileDefinitionSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  /** Partial localization overrides merged onto the base config. */
  localization: LocalizationPreferencesSchema.partial().optional(),
  /**
   * When set, only these catalog instance IDs appear in the profile manifest,
   * in this order. Missing IDs are skipped.
   */
  catalogInstanceIds: z.array(z.string().min(1)).optional(),
  /** Profile rule overrides (keys set here win over `globalRules`). */
  rules: RuleSetSchema.optional(),
  /** Profile sorting plan; replaces `globalSorting` when set. */
  sorting: SortingPlanSchema.optional(),
  /**
   * Partial presentation overrides deep-merged onto config `presentation`
   * (same naming as MetaLayerConfig — not a separate “appearance” field).
   */
  presentation: PresentationConfigSchema.partial().optional(),
  /** Preferred tracking provider for this profile. */
  trackingProvider: ProfileTrackingProviderSchema.optional(),
});

export const MetaLayerConfigSchema = z.object({
  configVersion: z.literal(METALAYER_CONFIG_VERSION),
  name: z.string().min(1),
  localization: LocalizationPreferencesSchema,
  identity: IdentityPreferencesSchema.default({ stremioPublicId: 'imdb' }),
  catalogs: z.array(CatalogDefinitionSchema).default([]),
  profiles: z.array(ProfileDefinitionSchema).default([]),
  globalRules: RuleSetSchema.default({}),
  globalSorting: SortingPlanSchema.optional(),
  search: SearchPreferencesSchema.default(DEFAULT_SEARCH_PREFERENCES),
  fieldProviders: FieldProvidersSchema,
  /** Optional Field Resolution Chains config (AGENTS.md §10). When absent, derived from fieldProviders. */
  resolution: z
    .object({
      version: z.literal(1),
      defaults: z
        .object({
          fields: z.record(z.any()).default({}),
        })
        .default({ fields: {} }),
      mediaTypes: z.record(z.any()).default({}),
    })
    .passthrough()
    .optional(),
  /** Display / presentation preferences (AGENTS.md §15). */
  presentation: PresentationConfigSchema.default(DEFAULT_PRESENTATION),
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
export type SearchPreferences = z.infer<typeof SearchPreferencesSchema>;
export type MergeDefinition = z.infer<typeof MergeDefinitionSchema>;
export type RotationDefinition = z.infer<typeof RotationDefinitionSchema>;
export type RuleContext = z.infer<typeof RuleContextSchema>;
export type RuleSet = z.infer<typeof RuleSetSchema>;
export type SortingField = z.infer<typeof SortingFieldSchema>;
export type SortingCriterion = z.infer<typeof SortingCriterionSchema>;
export type SortingPlan = z.infer<typeof SortingPlanSchema>;
export type ResolvableField = z.infer<typeof ResolvableFieldSchema>;
export type FieldProviders = z.infer<typeof FieldProvidersSchema>;
export type ProfileDefinition = z.infer<typeof ProfileDefinitionSchema>;
export type ProfileTrackingProvider = z.infer<
  typeof ProfileTrackingProviderSchema
>;
export type StaticCatalogItem = z.infer<typeof StaticCatalogItemSchema>;
export type CatalogDefinition = z.infer<typeof CatalogDefinitionSchema>;
export type MetaLayerConfig = z.infer<typeof MetaLayerConfigSchema>;
// PresentationConfig re-exported from ./presentation.js above.

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
    profiles: [],
    globalRules: {},
    fieldProviders: DEFAULT_FIELD_PROVIDERS,
    presentation: DEFAULT_PRESENTATION,
    featureFlags: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function parseMetaLayerConfig(input: unknown): MetaLayerConfig {
  return MetaLayerConfigSchema.parse(input);
}

export function findProfile(
  profiles: ProfileDefinition[],
  profileId: string,
): ProfileDefinition | undefined {
  return profiles.find((profile) => profile.profileId === profileId);
}

export function mergeLocalization(
  base: LocalizationPreferences,
  override?: Partial<LocalizationPreferences>,
): LocalizationPreferences {
  if (!override) return base;
  return LocalizationPreferencesSchema.parse({
    ...base,
    ...override,
    metadataFallbackLocales:
      override.metadataFallbackLocales ?? base.metadataFallbackLocales,
  });
}

export function filterCatalogsForProfile(
  catalogs: CatalogDefinition[],
  catalogInstanceIds?: string[],
): CatalogDefinition[] {
  if (!catalogInstanceIds || catalogInstanceIds.length === 0) {
    return catalogs;
  }
  const byId = new Map(catalogs.map((catalog) => [catalog.instanceId, catalog]));
  const ordered: CatalogDefinition[] = [];
  for (const instanceId of catalogInstanceIds) {
    const catalog = byId.get(instanceId);
    if (catalog) ordered.push(catalog);
  }
  return ordered.map((catalog, index) => ({ ...catalog, position: index }));
}

/**
 * Thin rule merge for profiles (AGENTS.md §13.4).
 * Defined keys on `profile` override `global`. Does not import `@metalayer/rules`
 * (avoids a config→rules cycle); the server catalog path still runs
 * `resolveEffectiveRules` over the resulting `globalRules` + catalog rules.
 */
export function mergeProfileRules(
  global: RuleSet,
  profile?: RuleSet,
): RuleSet {
  if (!profile) return global;
  const merged: RuleSet = { ...global };
  for (const [key, value] of Object.entries(profile) as Array<
    [keyof RuleSet, RuleSet[keyof RuleSet]]
  >) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

/** Shallow-merge presentation overrides onto the base presentation config. */
export function mergePresentation(
  base: PresentationConfig,
  override?: Partial<PresentationConfig>,
): PresentationConfig {
  if (!override) return base;
  return PresentationConfigSchema.parse({
    ...base,
    ...override,
  });
}

/** Apply a profile's overrides onto a config snapshot for manifest/serving. */
export function applyProfileToConfig(
  config: MetaLayerConfig,
  profile: ProfileDefinition,
): MetaLayerConfig {
  return {
    ...config,
    name: `${config.name} · ${profile.name}`,
    localization: mergeLocalization(config.localization, profile.localization),
    catalogs: filterCatalogsForProfile(
      config.catalogs,
      profile.catalogInstanceIds,
    ),
    globalRules: mergeProfileRules(config.globalRules, profile.rules),
    globalSorting: profile.sorting ?? config.globalSorting,
    presentation: mergePresentation(config.presentation, profile.presentation),
  };
}
