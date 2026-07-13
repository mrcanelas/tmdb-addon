import type { CatalogDefinition } from '@metalayer/config';

function newCatalogInstanceId(): string {
  const uuid = globalThis.crypto.randomUUID().replace(/-/g, '');
  return `cat_${uuid.slice(0, 16)}`;
}

/** Stable sort: position ascending, then instanceId for ties. */
export function sortCatalogsByPosition(
  catalogs: CatalogDefinition[],
): CatalogDefinition[] {
  return [...catalogs].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.instanceId.localeCompare(b.instanceId);
  });
}

/** Rewrite positions to 0..n-1 preserving the given array order. */
export function reindexCatalogPositions(
  catalogs: CatalogDefinition[],
): CatalogDefinition[] {
  return catalogs.map((catalog, index) => ({
    ...catalog,
    position: index,
  }));
}

export function resolveCatalogDisplayName(
  catalog: CatalogDefinition,
  locale?: string,
): string {
  const values = catalog.name?.values;
  if (locale && values) {
    const exact = values[locale];
    if (exact) return exact;

    const base = locale.split('-')[0]?.toLowerCase();
    if (base) {
      const languageMatch = Object.entries(values).find(([key]) => {
        const keyBase = key.split('-')[0]?.toLowerCase();
        return keyBase === base;
      });
      if (languageMatch?.[1]) return languageMatch[1];
    }
  }
  if (catalog.name?.default) return catalog.name.default;
  if (catalog.customName) return catalog.customName;
  return catalog.originalName;
}

/**
 * Manifest catalog order must match Catalog Studio order.
 * Movie, series, and anime share one ordered list (AGENTS.md §12.5).
 */
export function toManifestCatalogEntries(
  catalogs: CatalogDefinition[],
  locale?: string,
): Array<{
  instanceId: string;
  id: string;
  type: CatalogDefinition['mediaType'];
  name: string;
  showInHome: boolean;
}> {
  return sortCatalogsByPosition(catalogs)
    .filter((catalog) => catalog.enabled)
    .map((catalog) => ({
      instanceId: catalog.instanceId,
      id: `${catalog.provider}.${catalog.providerCatalogId}`,
      type: catalog.mediaType,
      name: resolveCatalogDisplayName(catalog, locale),
      showInHome: catalog.showInHome,
    }));
}

export function renameCatalog(
  catalogs: CatalogDefinition[],
  instanceId: string,
  customName: string,
): CatalogDefinition[] {
  return catalogs.map((catalog) =>
    catalog.instanceId === instanceId
      ? {
          ...catalog,
          customName,
          name: {
            default: customName,
            values: catalog.name?.values,
          },
        }
      : catalog,
  );
}

export function duplicateCatalog(
  catalogs: CatalogDefinition[],
  instanceId: string,
): CatalogDefinition[] {
  const ordered = sortCatalogsByPosition(catalogs);
  const source = ordered.find((catalog) => catalog.instanceId === instanceId);
  if (!source) return ordered;

  const insertAt = source.position + 1;
  const copy: CatalogDefinition = {
    ...source,
    instanceId: newCatalogInstanceId(),
    customName: `${resolveCatalogDisplayName(source)} (copy)`,
    name: {
      default: `${resolveCatalogDisplayName(source)} (copy)`,
    },
    position: insertAt,
  };

  const next = ordered.flatMap((catalog) => {
    if (catalog.instanceId !== instanceId) return [catalog];
    return [catalog, copy];
  });
  return reindexCatalogPositions(next);
}

export function moveCatalog(
  catalogs: CatalogDefinition[],
  instanceId: string,
  toIndex: number,
): CatalogDefinition[] {
  const ordered = sortCatalogsByPosition(catalogs);
  const fromIndex = ordered.findIndex((catalog) => catalog.instanceId === instanceId);
  if (fromIndex < 0) return ordered;

  const clamped = Math.max(0, Math.min(ordered.length - 1, toIndex));
  if (fromIndex === clamped) return reindexCatalogPositions(ordered);

  const next = [...ordered];
  const [item] = next.splice(fromIndex, 1);
  next.splice(clamped, 0, item);
  return reindexCatalogPositions(next);
}

export function setCatalogEnabled(
  catalogs: CatalogDefinition[],
  instanceId: string,
  enabled: boolean,
): CatalogDefinition[] {
  return catalogs.map((catalog) =>
    catalog.instanceId === instanceId ? { ...catalog, enabled } : catalog,
  );
}

export function setCatalogShowInHome(
  catalogs: CatalogDefinition[],
  instanceId: string,
  showInHome: boolean,
): CatalogDefinition[] {
  return catalogs.map((catalog) =>
    catalog.instanceId === instanceId ? { ...catalog, showInHome } : catalog,
  );
}

export function createCatalogInstance(
  input: Omit<CatalogDefinition, 'instanceId' | 'position' | 'enabled' | 'showInHome' | 'tags'> & {
    instanceId?: string;
    position?: number;
    enabled?: boolean;
    showInHome?: boolean;
    tags?: string[];
  },
  existing: CatalogDefinition[] = [],
): CatalogDefinition {
  const ordered = sortCatalogsByPosition(existing);
  return {
    ...input,
    instanceId: input.instanceId ?? newCatalogInstanceId(),
    position: input.position ?? ordered.length,
    enabled: input.enabled ?? true,
    showInHome: input.showInHome ?? true,
    tags: input.tags ?? [],
  };
}
