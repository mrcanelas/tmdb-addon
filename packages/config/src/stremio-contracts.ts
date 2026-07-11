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

/** Empty catalog responses must never use fake media cards. */
export const EmptyCatalogResponseSchema = z.object({
  metas: z.array(z.unknown()).length(0),
});

export function assertEmptyCatalogResponse(value: unknown): { metas: [] } {
  return EmptyCatalogResponseSchema.parse(value) as { metas: [] };
}
