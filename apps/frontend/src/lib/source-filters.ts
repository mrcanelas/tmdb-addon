import type { PublicSource, ProviderCategory } from '@/lib/api';

export const SOURCE_CATEGORIES: ProviderCategory[] = [
  'metadata',
  'artwork',
  'ratings',
  'catalog',
  'tracking',
  'identity',
  'ai',
];

export function connectionChipColor(
  state: PublicSource['connectionState'],
): 'default' | 'success' | 'warning' | 'danger' | 'accent' {
  switch (state) {
    case 'connected':
      return 'success';
    case 'degraded':
    case 'expired':
      return 'warning';
    case 'invalid':
      return 'danger';
    case 'coming_soon':
      return 'accent';
    default:
      return 'default';
  }
}

/** Sources with an active or broken connection (not merely catalog entries). */
export function isManagedConnection(
  state: PublicSource['connectionState'],
): boolean {
  return (
    state === 'connected' ||
    state === 'degraded' ||
    state === 'invalid' ||
    state === 'expired'
  );
}

export function capabilityLabels(
  source: PublicSource,
  t: (key: string) => string,
): string[] {
  return [
    source.capabilities.supportsLanguage ? t('sources.capability.language') : null,
    source.capabilities.supportsRegion ? t('sources.capability.region') : null,
    source.capabilities.supportsOAuth ? t('sources.capability.oauth') : null,
    source.capabilities.supportsTracking
      ? t('sources.capability.tracking')
      : null,
    source.capabilities.supportsSearch ? t('sources.capability.search') : null,
  ].filter(Boolean) as string[];
}

export function filterSources(
  sources: PublicSource[],
  opts: {
    query: string;
    category: ProviderCategory | 'all';
  },
): PublicSource[] {
  const q = opts.query.trim().toLowerCase();
  return sources.filter((source) => {
    if (
      opts.category !== 'all' &&
      !source.categories.includes(opts.category)
    ) {
      return false;
    }
    if (!q) return true;
    return (
      source.name.toLowerCase().includes(q) ||
      source.id.toLowerCase().includes(q)
    );
  });
}

export function groupByPrimaryCategory(
  sources: PublicSource[],
): Array<{ category: ProviderCategory; items: PublicSource[] }> {
  const order = SOURCE_CATEGORIES;
  const buckets = new Map<ProviderCategory, PublicSource[]>();
  for (const category of order) {
    buckets.set(category, []);
  }
  for (const source of sources) {
    const primary = source.categories[0] ?? 'metadata';
    const list = buckets.get(primary) ?? [];
    list.push(source);
    buckets.set(primary, list);
  }
  return order
    .map((category) => ({
      category,
      items: buckets.get(category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}
