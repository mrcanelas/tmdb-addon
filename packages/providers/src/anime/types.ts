import type { AnimeFormat, AnimeTitleVariants } from '@metalayer/anime';

export interface AnimeCatalogItem {
  id: number;
  name: string;
  mediaType: 'anime';
  format?: AnimeFormat;
  posterUrl?: string | null;
  /** Public Stremio-style id for this provider, e.g. anilist:5114 */
  publicId: string;
  externalIds?: {
    anilist?: number;
    mal?: number;
    kitsu?: number;
  };
}

export interface AnimeMetadataSummary {
  id: number;
  titles: AnimeTitleVariants;
  description?: string;
  format: AnimeFormat;
  episodes?: number;
  status?: string;
  posterUrl?: string | null;
  averageScore?: number;
  publicId: string;
  externalIds: {
    anilist?: number;
    mal?: number;
    kitsu?: number;
  };
}

/**
 * One episode of an anime entry in provider (absolute-within-entry) numbering.
 * Season mapping onto TMDB/IMDb numbering happens in the resolver (AGENTS.md §10.11).
 */
export interface AnimeEpisode {
  /** 1-based episode index within the provider entry. */
  number: number;
  title?: string;
  /** ISO date (YYYY-MM-DD) or full timestamp when known. */
  airDate?: string;
  thumbnailUrl?: string;
  overview?: string;
  filler?: boolean;
  recap?: boolean;
}

export interface AnimeEpisodesPage {
  episodes: AnimeEpisode[];
  hasMore: boolean;
}

/** Hard ceiling to keep long-runners (One Piece…) bounded per request. */
export const ANIME_EPISODES_MAX_PAGES = 25;

export type AnimeProviderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
