import type { CatalogListItem } from '@/lib/api';

export function toggleSelection(
  selected: Set<string>,
  instanceId: string,
): Set<string> {
  const next = new Set(selected);
  if (next.has(instanceId)) next.delete(instanceId);
  else next.add(instanceId);
  return next;
}

export function selectAllVisible(catalogs: CatalogListItem[]): Set<string> {
  return new Set(catalogs.map((catalog) => catalog.instanceId));
}

export function selectByProvider(
  catalogs: CatalogListItem[],
  provider: string,
  current: Set<string>,
): Set<string> {
  const next = new Set(current);
  for (const catalog of catalogs) {
    if (catalog.provider === provider) next.add(catalog.instanceId);
  }
  return next;
}

export function deselectByProvider(
  catalogs: CatalogListItem[],
  provider: string,
  current: Set<string>,
): Set<string> {
  const next = new Set(current);
  for (const catalog of catalogs) {
    if (catalog.provider === provider) next.delete(catalog.instanceId);
  }
  return next;
}

export function selectByMediaType(
  catalogs: CatalogListItem[],
  mediaType: CatalogListItem['mediaType'],
  current: Set<string>,
): Set<string> {
  const next = new Set(current);
  for (const catalog of catalogs) {
    if (catalog.mediaType === mediaType) next.add(catalog.instanceId);
  }
  return next;
}

export function deselectByMediaType(
  catalogs: CatalogListItem[],
  mediaType: CatalogListItem['mediaType'],
  current: Set<string>,
): Set<string> {
  const next = new Set(current);
  for (const catalog of catalogs) {
    if (catalog.mediaType === mediaType) next.delete(catalog.instanceId);
  }
  return next;
}

export function invertSelection(
  catalogs: CatalogListItem[],
  current: Set<string>,
): Set<string> {
  const next = new Set<string>();
  for (const catalog of catalogs) {
    if (!current.has(catalog.instanceId)) next.add(catalog.instanceId);
  }
  return next;
}

export function uniqueProviders(catalogs: CatalogListItem[]): string[] {
  return [...new Set(catalogs.map((catalog) => catalog.provider))].sort();
}
