/**
 * Fribb-style cross-id rows (AGENTS.md §17.2).
 * CI uses `FRIBB_FIXTURE` only. Live dataset loading is opt-in via
 * `loadFribbMappings` with a strict host allowlist (AGENTS.md §30.1).
 */
export interface FribbAnimeMappingRow {
  malId?: number;
  anilistId?: number;
  kitsuId?: number;
  anidbId?: number;
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  type?: 'tv' | 'movie' | 'ova' | 'ona' | 'special';
  title?: string;
  /** Season the entry maps to on TMDB/TVDB when known (fixture / corrections). */
  tmdbSeason?: number;
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
    tmdbSeason: 1,
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
    tmdbSeason: 1,
  },
];

export function fribbRowsToProviderIds(row: FribbAnimeMappingRow) {
  return {
    mal: row.malId,
    anilist: row.anilistId,
    kitsu: row.kitsuId,
    anidb: row.anidbId,
    tmdb: row.tmdbId,
    tvdb: row.tvdbId,
    imdb: row.imdbId,
  };
}

export type FribbLookupProvider = 'anilist' | 'mal' | 'kitsu' | 'anidb' | 'tmdb';

export function findFribbRow(
  rows: FribbAnimeMappingRow[],
  provider: FribbLookupProvider,
  id: number,
): FribbAnimeMappingRow | undefined {
  const key = (
    {
      anilist: 'anilistId',
      mal: 'malId',
      kitsu: 'kitsuId',
      anidb: 'anidbId',
      tmdb: 'tmdbId',
    } as const
  )[provider];
  return rows.find((row) => row[key] === id);
}

/** Public Fribb `anime-lists` raw location. */
export const FRIBB_DEFAULT_URL =
  'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';

/** Hosts allowed for the live dataset (SSRF allowlist, AGENTS.md §30.1). */
export const FRIBB_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'raw.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
]);

/** ~30 MB ceiling: the full list is ~20 MB today. */
export const FRIBB_MAX_BYTES = 30 * 1024 * 1024;

export class FribbSourceError extends Error {
  constructor(
    readonly code: 'URL_NOT_ALLOWED' | 'RESPONSE_TOO_LARGE' | 'UPSTREAM' | 'INVALID_PAYLOAD',
    message: string,
  ) {
    super(message);
    this.name = 'FribbSourceError';
  }
}

export function isAllowedFribbUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && FRIBB_ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Fribb raw row keys (`anime-list-full.json`). */
interface FribbRawRow {
  mal_id?: number;
  anilist_id?: number;
  kitsu_id?: number;
  anidb_id?: number;
  themoviedb_id?: number | string;
  thetvdb_id?: number;
  imdb_id?: string;
  type?: string;
}

function normalizeType(raw: string | undefined): FribbAnimeMappingRow['type'] {
  switch ((raw ?? '').toUpperCase()) {
    case 'TV':
      return 'tv';
    case 'MOVIE':
      return 'movie';
    case 'OVA':
      return 'ova';
    case 'ONA':
      return 'ona';
    case 'SPECIAL':
      return 'special';
    default:
      return undefined;
  }
}

export function parseFribbPayload(payload: unknown): FribbAnimeMappingRow[] {
  if (!Array.isArray(payload)) {
    throw new FribbSourceError('INVALID_PAYLOAD', 'Fribb payload must be an array');
  }
  const rows: FribbAnimeMappingRow[] = [];
  for (const raw of payload as FribbRawRow[]) {
    if (!raw || typeof raw !== 'object') continue;
    const tmdb =
      typeof raw.themoviedb_id === 'number'
        ? raw.themoviedb_id
        : typeof raw.themoviedb_id === 'string' && /^\d+$/.test(raw.themoviedb_id)
          ? Number(raw.themoviedb_id)
          : undefined;
    const imdb =
      typeof raw.imdb_id === 'string' && /^tt\d+$/.test(raw.imdb_id) ? raw.imdb_id : undefined;
    const row: FribbAnimeMappingRow = {
      malId: typeof raw.mal_id === 'number' ? raw.mal_id : undefined,
      anilistId: typeof raw.anilist_id === 'number' ? raw.anilist_id : undefined,
      kitsuId: typeof raw.kitsu_id === 'number' ? raw.kitsu_id : undefined,
      anidbId: typeof raw.anidb_id === 'number' ? raw.anidb_id : undefined,
      tvdbId: typeof raw.thetvdb_id === 'number' ? raw.thetvdb_id : undefined,
      tmdbId: tmdb,
      imdbId: imdb,
      type: normalizeType(raw.type),
    };
    if (row.malId || row.anilistId || row.kitsuId) rows.push(row);
  }
  return rows;
}

export interface LoadFribbMappingsOptions {
  url?: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  signal?: AbortSignal;
  maxBytes?: number;
}

/**
 * Load the live Fribb dataset. Callers must cache the result (the file is
 * large) and fall back to `FRIBB_FIXTURE` when loading fails.
 */
export async function loadFribbMappings(
  options: LoadFribbMappingsOptions = {},
): Promise<FribbAnimeMappingRow[]> {
  const url = options.url ?? FRIBB_DEFAULT_URL;
  if (!isAllowedFribbUrl(url)) {
    throw new FribbSourceError('URL_NOT_ALLOWED', 'Fribb dataset URL is not in the allowlist');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    method: 'GET',
    redirect: 'error',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new FribbSourceError('UPSTREAM', `Fribb dataset returned HTTP ${response.status}`);
  }
  const maxBytes = options.maxBytes ?? FRIBB_MAX_BYTES;
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > maxBytes) {
    throw new FribbSourceError('RESPONSE_TOO_LARGE', 'Fribb dataset exceeds the size limit');
  }
  const text = await response.text();
  if (text.length > maxBytes) {
    throw new FribbSourceError('RESPONSE_TOO_LARGE', 'Fribb dataset exceeds the size limit');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new FribbSourceError('INVALID_PAYLOAD', 'Fribb dataset is not valid JSON');
  }
  return parseFribbPayload(payload);
}
