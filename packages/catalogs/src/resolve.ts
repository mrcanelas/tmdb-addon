import type { CatalogDefinition } from '@metalayer/config';
import { sortCatalogsByPosition } from './studio.js';
import { mergeMetas, type CatalogMetaPreview } from './merge.js';
import { pickRotationSource } from './rotation.js';

export type FetchCatalogLeaf = (
  catalog: CatalogDefinition,
) => Promise<CatalogMetaPreview[]>;

export type CatalogPreviewWarningCode =
  | 'INSTANCE_NOT_FOUND'
  | 'ROTATION_SOURCE_NOT_FOUND'
  | 'ROTATION_ACTIVE'
  | 'MERGE_SOURCE_NOT_FOUND'
  | 'LEAF_FETCH_FAILED';

export interface CatalogPreviewWarning {
  code: CatalogPreviewWarningCode;
  params?: {
    instanceId?: string;
    sourceId?: string;
    mode?: string;
  };
}

export interface CatalogResolveResult {
  metas: CatalogMetaPreview[];
  warnings: CatalogPreviewWarning[];
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
  const warnings: CatalogPreviewWarning[] = [];

  if (!target) {
    return {
      metas: [],
      warnings: [{ code: 'INSTANCE_NOT_FOUND', params: { instanceId } }],
    };
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
        warnings: [
          {
            code: 'ROTATION_SOURCE_NOT_FOUND',
            params: { sourceId: activeSourceId },
          },
        ],
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
        {
          code: 'ROTATION_ACTIVE',
          params: { mode: target.rotation.mode, sourceId: activeSourceId },
        },
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
        warnings.push({
          code: 'MERGE_SOURCE_NOT_FOUND',
          params: { sourceId: source.instanceId },
        });
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
  } catch {
    warnings.push({
      code: 'LEAF_FETCH_FAILED',
      params: { instanceId: target.instanceId },
    });
    return { metas: [], warnings, mode: 'leaf' };
  }
}
