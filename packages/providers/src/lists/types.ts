/**
 * Provider-neutral list/account catalog item (AGENTS.md §12.2, §20).
 * Produced by account/list providers (Trakt, MDBList, TMDB account, SIMKL,
 * AniList, MAL) and converted into `CatalogMetaPreview` by the server.
 */
export interface ListCatalogItem {
  /** Public Stremio id (`tt…`, `tmdb:…`, `anilist:…`, `mal:…`). */
  publicId: string;
  mediaType: 'movie' | 'series' | 'anime';
  name: string;
  year?: number;
  posterUrl?: string | null;
  rating?: number;
  /** Position in the source list (1-based) when the provider exposes ordering. */
  position?: number;
  externalIds?: Record<string, string | number>;
}

export interface ListCatalogPage {
  items: ListCatalogItem[];
  /** True when the provider reports or implies another page. */
  hasMore: boolean;
}

/** Catalog a connected account can expose (used by the Studio source picker). */
export interface AccountCatalogDescriptor {
  provider: string;
  providerCatalogId: string;
  mediaTypes: Array<'movie' | 'series' | 'anime'>;
  name: string;
  /** Whether a user credential (OAuth token / API key) is required. */
  requiresCredential: boolean;
}

export const LIST_PAGE_SIZE = 20;

export function sliceListPage<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE): {
  items: T[];
  hasMore: boolean;
} {
  const start = Math.max(0, page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { items: slice, hasMore: start + pageSize < items.length };
}

/** Prefer IMDb ids for Stremio; fall back to `tmdb:` then provider ids. */
export function publicIdFromExternalIds(
  ids: { imdb?: string | null; tmdb?: number | string | null } | undefined,
  fallback?: string,
): string | undefined {
  if (ids?.imdb && /^tt\d+$/.test(ids.imdb)) return ids.imdb;
  if (ids?.tmdb !== undefined && ids.tmdb !== null && ids.tmdb !== '') {
    return `tmdb:${ids.tmdb}`;
  }
  return fallback;
}
