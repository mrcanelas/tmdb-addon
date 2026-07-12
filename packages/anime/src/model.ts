/** Anime formats treated as first-class (AGENTS.md §17). */
export type AnimeFormat =
  | 'tv'
  | 'movie'
  | 'ova'
  | 'ona'
  | 'special'
  | 'music'
  | 'unknown';

export type AnimeNumberingMode = 'broadcast' | 'absolute' | 'dvd';

export type AnimeAirStatus =
  | 'finished'
  | 'releasing'
  | 'not_yet_released'
  | 'cancelled'
  | 'hiatus'
  | 'unknown';

export interface AnimeTitleVariants {
  native?: string;
  romaji?: string;
  english?: string;
  localized?: string;
}

export interface AnimeCourMapping {
  /** Absolute episode index (1-based). */
  absoluteEpisode: number;
  /** Cour / part within a year or season split (1-based). */
  cour: number;
  /** Provider season number when known. */
  seasonNumber?: number;
  /** Episode within the cour (1-based). */
  episodeInCour: number;
}

/**
 * Map absolute episode numbers onto split-cour seasons.
 * Example: 24 eps, 2 cours of 12 → ep 13 = cour 2 ep 1.
 */
export function mapAbsoluteToCour(
  absoluteEpisode: number,
  courSizes: number[],
): AnimeCourMapping | null {
  if (absoluteEpisode < 1 || courSizes.length === 0) return null;
  let remaining = absoluteEpisode;
  for (let i = 0; i < courSizes.length; i++) {
    const size = courSizes[i]!;
    if (size < 1) return null;
    if (remaining <= size) {
      return {
        absoluteEpisode,
        cour: i + 1,
        seasonNumber: i + 1,
        episodeInCour: remaining,
      };
    }
    remaining -= size;
  }
  return null;
}

export function mapCourToAbsolute(
  cour: number,
  episodeInCour: number,
  courSizes: number[],
): number | null {
  if (cour < 1 || episodeInCour < 1 || cour > courSizes.length) return null;
  let absolute = episodeInCour;
  for (let i = 0; i < cour - 1; i++) {
    absolute += courSizes[i]!;
  }
  const size = courSizes[cour - 1]!;
  if (episodeInCour > size) return null;
  return absolute;
}

export function normalizeAnimeFormat(raw: string | null | undefined): AnimeFormat {
  if (!raw) return 'unknown';
  const value = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  switch (value) {
    case 'tv':
    case 'tvshort':
      return 'tv';
    case 'movie':
      return 'movie';
    case 'ova':
      return 'ova';
    case 'ona':
      return 'ona';
    case 'special':
    case 'specials':
      return 'special';
    case 'music':
      return 'music';
    default:
      return 'unknown';
  }
}

/** Prefer localized → english → romaji → native (anime title modes are independent). */
export function pickAnimeTitle(
  titles: AnimeTitleVariants,
  preference: 'localized' | 'english' | 'romaji' | 'native' = 'localized',
): string | null {
  const order: Array<keyof AnimeTitleVariants> =
    preference === 'native'
      ? ['native', 'romaji', 'english', 'localized']
      : preference === 'romaji'
        ? ['romaji', 'english', 'localized', 'native']
        : preference === 'english'
          ? ['english', 'romaji', 'localized', 'native']
          : ['localized', 'english', 'romaji', 'native'];

  for (const key of order) {
    const value = titles[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Tracking foundation types — OAuth wiring is Phase I. */
export type AnimeWatchStatus =
  | 'watching'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_watch'
  | 'unknown';

export interface AnimeTrackingEntry {
  provider: 'anilist' | 'mal' | 'kitsu';
  providerMediaId: string;
  status: AnimeWatchStatus;
  progress?: number;
  score?: number;
}

export interface AnimeTrackingPort {
  listEntries(userId: string): Promise<AnimeTrackingEntry[]>;
  getStatus(providerMediaId: string): Promise<AnimeWatchStatus | null>;
}
