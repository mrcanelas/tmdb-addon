import type { CatalogDefinition } from '@metalayer/config';

export type PublicMetaDBCatalogMediaType = 'movie' | 'series';

export type PublicMetaDBCatalogDraft = Omit<
  CatalogDefinition,
  'instanceId' | 'position' | 'enabled' | 'showInHome' | 'tags'
>;

/** Detect movie/series coverage from list item samples (legacy PublicMetaDB behavior). */
export function detectPublicMetaDBListMediaTypes(
  items: Array<{ media_type: 'movie' | 'tv' }>,
): PublicMetaDBCatalogMediaType[] {
  const hasMovies = items.some((item) => item.media_type === 'movie');
  const hasShows = items.some((item) => item.media_type === 'tv');
  if (hasMovies && hasShows) return ['movie', 'series'];
  if (hasMovies) return ['movie'];
  if (hasShows) return ['series'];
  return ['series'];
}

export function createPublicMetaDBUpNextCatalogDraft(): PublicMetaDBCatalogDraft {
  return {
    provider: 'publicmetadb',
    providerCatalogId: 'upnext',
    mediaType: 'series',
    originalName: 'PublicMetaDB Up Next',
    name: { default: 'PublicMetaDB Up Next' },
    customName: 'PublicMetaDB Up Next',
  };
}

export function createPublicMetaDBListCatalogDrafts(
  list: { id: string; name: string },
  mediaTypes: PublicMetaDBCatalogMediaType[],
): PublicMetaDBCatalogDraft[] {
  if (mediaTypes.length === 0) {
    mediaTypes = ['series'];
  }

  return mediaTypes.map((mediaType) => {
    const suffix =
      mediaTypes.length > 1
        ? mediaType === 'movie'
          ? ' (Movies)'
          : ' (Series)'
        : '';
    const displayName = `${list.name}${suffix}`;
    return {
      provider: 'publicmetadb',
      providerCatalogId: `list.${list.id}`,
      mediaType,
      originalName: displayName,
      name: { default: displayName },
      customName: displayName,
    };
  });
}

export function createPublicMetaDBPickCatalogDrafts(pick: {
  id: string;
  name: string;
  filters?: { media_types?: string[] };
}): PublicMetaDBCatalogDraft[] {
  const mediaTypes = detectPickMediaTypes(pick.filters?.media_types);
  if (mediaTypes.length <= 1) {
    const mediaType = mediaTypes[0] ?? 'series';
    return [
      {
        provider: 'publicmetadb',
        providerCatalogId: `pick.${pick.id}`,
        mediaType,
        originalName: pick.name,
        name: { default: pick.name },
        customName: pick.name,
      },
    ];
  }

  return mediaTypes.map((mediaType) => {
    const suffix = mediaType === 'movie' ? ' (Movies)' : ' (Series)';
    const displayName = `${pick.name}${suffix}`;
    return {
      provider: 'publicmetadb',
      providerCatalogId: `pick.${pick.id}`,
      mediaType,
      originalName: displayName,
      name: { default: displayName },
      customName: displayName,
    };
  });
}

function detectPickMediaTypes(
  mediaTypes: string[] | undefined,
): PublicMetaDBCatalogMediaType[] {
  if (!mediaTypes?.length) return ['series'];
  const normalized = new Set(
    mediaTypes.map((value) => (value === 'tv' ? 'series' : value)),
  );
  const out: PublicMetaDBCatalogMediaType[] = [];
  if (normalized.has('movie')) out.push('movie');
  if (normalized.has('series')) out.push('series');
  return out.length > 0 ? out : ['series'];
}

/** Skip catalogs already present (same provider + providerCatalogId + mediaType). */
export function filterNewPublicMetaDBCatalogs(
  existing: CatalogDefinition[],
  incoming: PublicMetaDBCatalogDraft[],
): PublicMetaDBCatalogDraft[] {
  const keys = new Set(
    existing
      .filter((catalog) => catalog.provider === 'publicmetadb')
      .map(
        (catalog) =>
          `${catalog.providerCatalogId}:${catalog.mediaType}`,
      ),
  );
  return incoming.filter(
    (catalog) => !keys.has(`${catalog.providerCatalogId}:${catalog.mediaType}`),
  );
}
