import { z } from 'zod';

/** Minimum Stremio manifest shape the legacy addon must keep compatible. */
export const LegacyManifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  resources: z.array(z.string()).min(1),
  types: z.array(z.enum(['movie', 'series'])).min(1),
  idPrefixes: z.array(z.string()).min(1),
  behaviorHints: z
    .object({
      configurable: z.boolean().optional(),
      configurationRequired: z.boolean().optional(),
    })
    .passthrough(),
  catalogs: z.array(
    z
      .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        pageSize: z.number().optional(),
        extra: z.array(z.unknown()).optional(),
      })
      .passthrough(),
  ),
});

export type LegacyManifest = z.infer<typeof LegacyManifestSchema>;

const LegacyMetaPreviewSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['movie', 'series']),
    name: z.string().min(1),
    poster: z.string().optional().nullable(),
    background: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    releaseInfo: z.union([z.string(), z.number()]).optional(),
    imdbRating: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

/** Catalog list response used by Stremio. */
export const CatalogResponseSchema = z.object({
  metas: z.array(LegacyMetaPreviewSchema),
});

export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

/**
 * MetaLayer / AGENTS.md contract: empty catalogs must be exactly { metas: [] }.
 * Never use fake media cards for errors or empty states.
 */
export const EmptyCatalogResponseSchema = z.object({
  metas: z.array(z.unknown()).length(0),
});

export function assertEmptyCatalogResponse(value: unknown): { metas: [] } {
  return EmptyCatalogResponseSchema.parse(value) as { metas: [] };
}

/**
 * Known legacy deviation (page 1 empty / error paths in getCatalog.js):
 * returns a synthetic "No Content" / "Error Loading Content" meta card.
 * Covered by contract tests so migration can replace it deliberately.
 */
export const LegacySyntheticEmptyMetaSchema = z.object({
  id: z.literal('tmdb:no-content'),
  type: z.enum(['movie', 'series']),
  name: z.string().min(1),
  poster: z.string().optional(),
  background: z.string().optional(),
  description: z.string().optional(),
  genres: z.array(z.string()).optional(),
});

export const LegacySyntheticEmptyCatalogSchema = z.object({
  metas: z.tuple([LegacySyntheticEmptyMetaSchema]),
});

export const MetaResponseSchema = z.object({
  meta: z
    .object({
      id: z.string().min(1),
      type: z.enum(['movie', 'series']),
      name: z.string().min(1),
      poster: z.string().optional().nullable(),
      background: z.string().optional().nullable(),
      logo: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      releaseInfo: z.union([z.string(), z.number()]).optional(),
      runtime: z.string().optional(),
      year: z.union([z.string(), z.number()]).optional(),
      imdbRating: z.union([z.string(), z.number()]).optional(),
      genres: z.array(z.string()).optional(),
      videos: z.array(z.unknown()).optional(),
      seasons: z.array(z.unknown()).optional(),
    })
    .passthrough(),
});

export type MetaResponse = z.infer<typeof MetaResponseSchema>;

/** Management/API style errors must not be wrapped as catalog metas. */
export function assertNotFakeErrorCatalog(value: unknown): void {
  const parsed = CatalogResponseSchema.parse(value);
  for (const meta of parsed.metas) {
    if (meta.id === 'tmdb:no-content') {
      throw new Error(
        'Fake error/empty meta card detected; MetaLayer must return { metas: [] } instead',
      );
    }
    const name = meta.name.toLowerCase();
    if (name.includes('error loading') || name.includes('something went wrong')) {
      throw new Error('Error represented as media card; forbidden in MetaLayer');
    }
  }
}
