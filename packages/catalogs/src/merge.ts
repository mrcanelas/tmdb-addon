import type { CatalogDefinition } from '@metalayer/config';

/** Lightweight catalog card used for Studio preview and merge engines. */
export interface CatalogMetaPreview {
  id: string;
  type: CatalogDefinition['mediaType'];
  name: string;
  poster?: string;
  releaseInfo?: string;
  provider?: string;
  sourceInstanceId?: string;
}

function dedupeById(metas: CatalogMetaPreview[]): CatalogMetaPreview[] {
  const seen = new Set<string>();
  const out: CatalogMetaPreview[] = [];
  for (const meta of metas) {
    if (seen.has(meta.id)) continue;
    seen.add(meta.id);
    out.push(meta);
  }
  return out;
}

/**
 * Merge ordered source pages into one preview list (AGENTS.md §12.6).
 */
export function mergeMetas(
  sources: Array<{ metas: CatalogMetaPreview[]; weight?: number }>,
  mode:
    | 'append'
    | 'interleave'
    | 'dedupe-union'
    | 'weighted-mix'
    | 'priority-fallback',
): CatalogMetaPreview[] {
  if (sources.length === 0) return [];

  switch (mode) {
    case 'priority-fallback': {
      const first = sources.find((source) => source.metas.length > 0);
      return first ? [...first.metas] : [];
    }
    case 'append':
      return sources.flatMap((source) => source.metas);
    case 'dedupe-union':
      return dedupeById(sources.flatMap((source) => source.metas));
    case 'interleave': {
      const queues = sources.map((source) => [...source.metas]);
      const out: CatalogMetaPreview[] = [];
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (const queue of queues) {
          const next = queue.shift();
          if (!next) continue;
          out.push(next);
          progressed = true;
        }
      }
      return out;
    }
    case 'weighted-mix': {
      const totalWeight = sources.reduce(
        (sum, source) => sum + (source.weight ?? 1),
        0,
      );
      const out: CatalogMetaPreview[] = [];
      for (const source of sources) {
        const weight = source.weight ?? 1;
        const take = Math.max(
          0,
          Math.round((source.metas.length * weight) / totalWeight),
        );
        out.push(...source.metas.slice(0, take || source.metas.length));
      }
      return dedupeById(out);
    }
    default:
      return [];
  }
}
