export type StremioPublicIdPreference = 'imdb' | 'tmdb';
export type PublicIdKind = 'imdb' | 'tmdb' | 'unknown';

export interface ParsedPublicId {
  kind: PublicIdKind;
  imdbId?: string;
  tmdbId?: string;
  raw: string;
}

export declare function normalizeImdbId(value: string | null | undefined): string | null;
export declare function normalizeTmdbPublicId(
  value: string | number | null | undefined,
): string | null;
export declare function parsePublicId(value: string): ParsedPublicId;
export declare function selectStremioPublicId(input: {
  imdbId?: string | null;
  tmdbId?: string | number | null;
  preference?: StremioPublicIdPreference;
}): string | null;
export declare function stremioIdPrefixes(
  preference?: StremioPublicIdPreference,
): string[];
