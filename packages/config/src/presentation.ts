import { z } from 'zod';

/**
 * How resolved metadata is presented in Stremio (AGENTS.md §15).
 * Distinct from Field Resolution Chains (how values are obtained).
 */
export const PresentationConfigSchema = z.object({
  /** Number of cast members on details; omit / undefined = unlimited. */
  castCount: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15)]).optional(),
  /** Prefix catalog names in the manifest with "MetaLayer - ". */
  catalogNamePrefix: z.boolean().default(false),
  /** Insert certification as the first genre on meta details. */
  showAgeRatingInGenres: z.boolean().default(false),
  /** Blur or hide episode thumbnails to avoid spoilers (runtime follow-up). */
  hideEpisodeSpoilers: z.boolean().default(false),
  /**
   * Keep rated posters on Continue Watching / Library surfaces
   * (runtime follow-up once public meta uses rated poster chains).
   */
  ratingPostersForLibrary: z.boolean().default(false),
});

export type PresentationConfig = z.infer<typeof PresentationConfigSchema>;

export const DEFAULT_PRESENTATION: PresentationConfig = PresentationConfigSchema.parse({});

export function parsePresentationConfig(input: unknown): PresentationConfig {
  return PresentationConfigSchema.parse(input ?? {});
}

export const CATALOG_NAME_PREFIX = 'MetaLayer - ';

/** Apply the configured catalog name prefix when enabled. */
export function applyCatalogNamePrefix(
  name: string,
  presentation: Pick<PresentationConfig, 'catalogNamePrefix'>,
): string {
  if (!presentation.catalogNamePrefix) return name;
  if (name.startsWith(CATALOG_NAME_PREFIX)) return name;
  return `${CATALOG_NAME_PREFIX}${name}`;
}
