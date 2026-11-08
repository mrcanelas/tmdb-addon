import { CatalogDefinitionSchema, type CatalogDefinition } from '@metalayer/config';
import { createCatalogInstance, reindexCatalogPositions, sortCatalogsByPosition } from './studio.js';

export function setCatalogTags(
  catalogs: CatalogDefinition[],
  instanceId: string,
  tags: string[],
): CatalogDefinition[] {
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return catalogs.map((catalog) =>
    catalog.instanceId === instanceId ? { ...catalog, tags: cleaned } : catalog,
  );
}

export function setCatalogGroup(
  catalogs: CatalogDefinition[],
  instanceId: string,
  group: string | undefined,
): CatalogDefinition[] {
  const cleaned = group?.trim() || undefined;
  return catalogs.map((catalog) => {
    if (catalog.instanceId !== instanceId) return catalog;
    const next = { ...catalog };
    if (cleaned) next.group = cleaned;
    else delete next.group;
    return next;
  });
}

export function deleteCatalog(
  catalogs: CatalogDefinition[],
  instanceId: string,
): CatalogDefinition[] {
  return reindexCatalogPositions(
    sortCatalogsByPosition(catalogs).filter((catalog) => catalog.instanceId !== instanceId),
  );
}

export function createMergedCatalog(
  catalogs: CatalogDefinition[],
  input: {
    name: string;
    mediaType: CatalogDefinition['mediaType'];
    mode: NonNullable<CatalogDefinition['merge']>['mode'];
    sourceInstanceIds: string[];
    weights?: number[];
  },
): CatalogDefinition[] {
  if (input.sourceInstanceIds.length < 2) {
    throw new Error('Merged catalogs require at least two sources');
  }
  const merged = createCatalogInstance(
    {
      provider: 'metalayer',
      providerCatalogId: 'merged',
      mediaType: input.mediaType,
      originalName: input.name,
      customName: input.name,
      name: { default: input.name },
      tags: ['merged'],
      merge: {
        mode: input.mode,
        sources: input.sourceInstanceIds.map((instanceId, index) => ({
          instanceId,
          weight: input.weights?.[index],
        })),
      },
    },
    catalogs,
  );
  return reindexCatalogPositions([...sortCatalogsByPosition(catalogs), merged]);
}

export function createRotatedCatalog(
  catalogs: CatalogDefinition[],
  input: {
    name: string;
    mediaType: CatalogDefinition['mediaType'];
    mode: NonNullable<CatalogDefinition['rotation']>['mode'];
    sourceInstanceIds: string[];
  },
): CatalogDefinition[] {
  if (input.sourceInstanceIds.length < 2) {
    throw new Error('Rotated catalogs require at least two sources');
  }
  const rotated = createCatalogInstance(
    {
      provider: 'metalayer',
      providerCatalogId: 'rotated',
      mediaType: input.mediaType,
      originalName: input.name,
      customName: input.name,
      name: { default: input.name },
      tags: ['rotated'],
      rotation: {
        mode: input.mode,
        sources: input.sourceInstanceIds,
      },
    },
    catalogs,
  );
  return reindexCatalogPositions([...sortCatalogsByPosition(catalogs), rotated]);
}

export function exportCatalogDefinitions(
  catalogs: CatalogDefinition[],
): CatalogDefinition[] {
  return sortCatalogsByPosition(catalogs).map((catalog) =>
    CatalogDefinitionSchema.parse(catalog),
  );
}

export function importCatalogDefinitions(
  existing: CatalogDefinition[],
  incoming: unknown,
  mode: 'replace' | 'append' = 'append',
): CatalogDefinition[] {
  const parsed = CatalogDefinitionSchema.array().parse(incoming);
  if (mode === 'replace') {
    return reindexCatalogPositions(
      parsed.map((catalog, index) =>
        createCatalogInstance(
          {
            ...catalog,
            position: index,
          },
          [],
        ),
      ),
    );
  }

  let next = sortCatalogsByPosition(existing);
  for (const catalog of parsed) {
    const { instanceId: _ignored, position: _pos, ...rest } = catalog;
    next = [...next, createCatalogInstance(rest, next)];
  }
  return reindexCatalogPositions(next);
}
