import { mapAbsoluteToCour } from './model.js';

/** Provider-neutral anime episode input (mirrors `@metalayer/providers` AnimeEpisode). */
export interface AnimeEpisodeInput {
  number: number;
  title?: string;
  airDate?: string;
  thumbnailUrl?: string;
  overview?: string;
  filler?: boolean;
  recap?: boolean;
}

export type AnimeVideoOrderType =
  | 'aired'
  | 'absolute'
  | 'dvd'
  | 'production'
  | 'provider-default'
  | 'community-corrected';

export interface AnimeVideo {
  id: string;
  title: string;
  name: string;
  season: number;
  episode: number;
  released?: string;
  thumbnail?: string;
  overview?: string;
}

export interface BuildAnimeVideosOptions {
  /** Effective episode order (AGENTS.md §10.11). `provider-default` behaves like `absolute`. */
  orderType: AnimeVideoOrderType;
  /**
   * Stremio id prefix for episodes. Use the IMDb id (`tt…`) when the Identity
   * Graph knows it, otherwise `tmdb:{id}` or `{provider}:{id}`.
   */
  idPrefix: string;
  /**
   * Season the provider entry maps to when `orderType` is `aired`
   * (AniList/MAL entries are usually one season each). Defaults to 1.
   */
  seasonNumber?: number;
  /** Split-cour sizes for `aired` order when one entry spans several seasons. */
  courSizes?: number[];
  /** Absolute offset for entries that continue a previous entry's numbering. */
  absoluteOffset?: number;
  /** Fallback title when the provider has none; receives the display number. */
  fallbackTitle?: (episode: number) => string;
}

/**
 * Convert provider episodes into Stremio `videos[]` following the effective
 * episode order. Absolute order keeps everything in season 1 so Stremio shows
 * one continuous list; aired order places episodes in the mapped season (or
 * splits cours onto consecutive seasons when `courSizes` is given).
 */
export function buildAnimeVideos(
  episodes: AnimeEpisodeInput[],
  options: BuildAnimeVideosOptions,
): AnimeVideo[] {
  const sorted = [...episodes]
    .filter((episode) => Number.isFinite(episode.number) && episode.number >= 1)
    .sort((a, b) => a.number - b.number);
  const fallbackTitle =
    options.fallbackTitle ?? ((episode: number) => `Episode ${episode}`);

  return sorted.map((episode) => {
    let season: number;
    let number: number;

    if (options.orderType === 'aired' && options.courSizes && options.courSizes.length > 0) {
      const mapped = mapAbsoluteToCour(episode.number, options.courSizes);
      const baseSeason = options.seasonNumber ?? 1;
      season = mapped ? baseSeason + mapped.cour - 1 : baseSeason + options.courSizes.length;
      number = mapped
        ? mapped.episodeInCour
        : episode.number - options.courSizes.reduce((sum, size) => sum + size, 0);
    } else if (options.orderType === 'aired') {
      season = options.seasonNumber ?? 1;
      number = episode.number;
    } else {
      // absolute / provider-default / dvd / production / community-corrected
      season = 1;
      number = episode.number + (options.absoluteOffset ?? 0);
    }

    const title = episode.title?.trim() || fallbackTitle(number);
    return {
      id: `${options.idPrefix}:${season}:${number}`,
      title,
      name: title,
      season,
      episode: number,
      released: episode.airDate,
      thumbnail: episode.thumbnailUrl,
      overview: episode.overview,
    };
  });
}
