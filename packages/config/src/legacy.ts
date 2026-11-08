import { z } from 'zod';

/**
 * Flat legacy TMDB Addon configuration shape (URL-compressed).
 * Used as the source model for MetaLayer import/migration.
 */
export const LegacyAddonConfigSchema = z
  .object({
    language: z.string().optional(),
    rpdbkey: z.string().optional(),
    topposterskey: z.string().optional(),
    geminikey: z.string().optional(),
    groqkey: z.string().optional(),
    openrouterkey: z.string().optional(),
    mdblistkey: z.string().optional(),
    publicmetadbkey: z.string().optional(),
    traktAccessToken: z.string().optional(),
    traktRefreshToken: z.string().optional(),
    tmdbApiKey: z.string().optional(),
    sessionId: z.string().optional(),
    includeAdult: z.union([z.boolean(), z.string()]).optional(),
    provideImdbId: z.union([z.boolean(), z.string()]).optional(),
    returnImdbId: z.union([z.boolean(), z.string()]).optional(),
    tmdbPrefix: z.union([z.boolean(), z.string()]).optional(),
    hideEpisodeThumbnails: z.union([z.boolean(), z.string()]).optional(),
    searchEnabled: z.union([z.boolean(), z.string()]).optional(),
    ageRating: z.string().optional(),
    catalogs: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          name: z.string().optional(),
          enabled: z.boolean().optional(),
          showInHome: z.boolean().optional(),
        }),
      )
      .optional(),
    hideInCinemaTag: z.union([z.boolean(), z.string()]).optional(),
    castCount: z.union([z.number(), z.string()]).optional(),
    showAgeRatingInGenres: z.union([z.boolean(), z.string()]).optional(),
    enableAgeRating: z.union([z.boolean(), z.string()]).optional(),
    showAgeRatingWithImdbRating: z.union([z.boolean(), z.string()]).optional(),
    strictRegionFilter: z.union([z.boolean(), z.string()]).optional(),
  })
  .passthrough();

export type LegacyAddonConfig = z.infer<typeof LegacyAddonConfigSchema>;

export function parseLegacyAddonConfig(input: unknown): LegacyAddonConfig {
  return LegacyAddonConfigSchema.parse(input);
}

/** Secret-bearing keys that must move to Secret Vault on migration. */
export const LEGACY_SECRET_KEYS = [
  'rpdbkey',
  'topposterskey',
  'geminikey',
  'groqkey',
  'openrouterkey',
  'mdblistkey',
  'publicmetadbkey',
  'traktAccessToken',
  'traktRefreshToken',
  'tmdbApiKey',
  'sessionId',
] as const;

export function listLegacySecretsPresent(config: LegacyAddonConfig): string[] {
  return LEGACY_SECRET_KEYS.filter((key) => {
    const value = config[key];
    return typeof value === 'string' && value.length > 0;
  });
}
