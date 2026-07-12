import type { CatalogDefinition } from '@metalayer/config';
import { sortCatalogsByPosition } from './studio.js';
import { mergeMetas, type CatalogMetaPreview } from './merge.js';
import { pickRotationSource } from './rotation.js';

export type FetchCatalogLeaf = (
  catalog: CatalogDefinition,
) => Promise<CatalogMetaPreview[]>;

export interface CatalogResolveResult {
  metas: CatalogMetaPreview[];
  warnings: string[];
  activeSourceId?: string;
  mode?: 'leaf' | 'merge' | 'rotation';
}

/**
 * Resolve preview results for a catalog instance (leaf, merge, or rotation).
 */
export async function resolveCatalogResults(
  catalogs: CatalogDefinition[],
  instanceId: string,
  fetchLeaf: FetchCatalogLeaf,
  options: { now?: Date } = {},
): Promise<CatalogResolveResult> {
  const ordered = sortCatalogsByPosition(catalogs);
  const byId = new Map(ordered.map((catalog) => [catalog.instanceId, catalog]));
  const target = byId.get(instanceId);
  const warnings: string[] = [];

  if (!target) {
    return { metas: [], warnings: [`Catalog instance ${instanceId} was not found`] };
  }

  if (target.rotation) {
    const activeSourceId = pickRotationSource(
      target.rotation.sources,
      target.rotation.mode,
      options.now,
    );
    const source = byId.get(activeSourceId);
    if (!source) {
      return {
        metas: [],
        warnings: [`Rotation source ${activeSourceId} was not found`],
        activeSourceId,
        mode: 'rotation',
      };
    }
    const nested = await resolveCatalogResults(catalogs, activeSourceId, fetchLeaf, options);
    return {
      metas: nested.metas.map((meta) => ({
        ...meta,
        sourceInstanceId: meta.sourceInstanceId ?? activeSourceId,
      })),
      warnings: [
        ...warnings,
        ...nested.warnings,
        `Rotation ${target.rotation.mode}: using ${activeSourceId}`,
      ],
      activeSourceId,
      mode: 'rotation',
    };
  }

  if (target.merge) {
    const pages = [];
    for (const source of target.merge.sources) {
      const child = byId.get(source.instanceId);
      if (!child) {
        warnings.push(`Merge source ${source.instanceId} was not found`);
        pages.push({ metas: [] as CatalogMetaPreview[], weight: source.weight });
        continue;
      }
      const nested = await resolveCatalogResults(
        catalogs,
        source.instanceId,
        fetchLeaf,
        options,
      );
      warnings.push(...nested.warnings);
      pages.push({
        metas: nested.metas.map((meta) => ({
          ...meta,
          sourceInstanceId: meta.sourceInstanceId ?? source.instanceId,
        })),
        weight: source.weight,
      });
    }

    return {
      metas: mergeMetas(pages, target.merge.mode),
      warnings,
      mode: 'merge',
    };
  }

  try {
    const metas = await fetchLeaf(target);
    return {
      metas: metas.map((meta) => ({
        ...meta,
        sourceInstanceId: meta.sourceInstanceId ?? target.instanceId,
        provider: meta.provider ?? target.provider,
      })),
      warnings,
      mode: 'leaf',
    };
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : `Failed to load ${target.instanceId}`,
    );
    return { metas: [], warnings, mode: 'leaf' };
  }
}
