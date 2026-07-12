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

export type AnimeProviderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
