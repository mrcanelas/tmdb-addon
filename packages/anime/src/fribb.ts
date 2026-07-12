/**
 * Fribb-style cross-id fixture rows (AGENTS.md §17.2).
 * CI uses fixtures only — no live dataset download in Phase H.
 */
export interface FribbAnimeMappingRow {
  malId?: number;
  anilistId?: number;
  kitsuId?: number;
  anidbId?: number;
  tmdbId?: number;
  imdbId?: string;
  type?: 'tv' | 'movie' | 'ova' | 'ona' | 'special';
  title?: string;
}

export const FRIBB_FIXTURE: FribbAnimeMappingRow[] = [
  {
    malId: 5114,
    anilistId: 5114,
    kitsuId: 1555,
    tmdbId: 31911,
    imdbId: 'tt1226770',
    type: 'tv',
    title: 'Fullmetal Alchemist: Brotherhood',
  },
  {
    malId: 21,
    anilistId: 21,
    kitsuId: 12,
    type: 'tv',
    title: 'One Piece',
  },
  {
    malId: 16498,
    anilistId: 16498,
    kitsuId: 7442,
    tmdbId: 1429,
    type: 'tv',
    title: 'Attack on Titan',
  },
];

export function fribbRowsToProviderIds(row: FribbAnimeMappingRow) {
  return {
    mal: row.malId,
    anilist: row.anilistId,
    kitsu: row.kitsuId,
    anidb: row.anidbId,
    tmdb: row.tmdbId,
    imdb: row.imdbId,
  };
}
