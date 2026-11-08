import type { ArtworkKind } from './types.js';

export type RatedPosterIdType = 'tmdb' | 'imdb' | 'tvdb';
export type RatedPosterMediaType = 'movie' | 'series';
export type RatedPosterExtension = 'png' | 'jpg';

/** How background ArtworkKind maps into the path segment `{segment}-default`. */
export type RatedPosterBackgroundSegment = 'background' | 'backdrop';

/** How non-English locales are serialized into `?lang=`. */
export type RatedPosterLangMode =
  | 'rpdb' // preserve select full tags; otherwise language code only
  | 'full'; // pass the locale tag as-is

export interface RatedPosterServiceProfile {
  id: string;
  baseUrl: string;
  extension: RatedPosterExtension;
  /** Default identity namespace in the path (`tmdb` / `imdb` / …). */
  idType: RatedPosterIdType;
  backgroundSegment: RatedPosterBackgroundSegment;
  /** RPDB-style `?fallback=true` (Top Posters omits this). */
  setFallbackQuery: boolean;
  langMode: RatedPosterLangMode;
  /**
   * When set, `ping` hits this path instead of probing a sample poster.
   * Relative to `baseUrl` (e.g. Top Posters `/auth/verify/{key}`).
   */
  verifyPath?: (apiKey: string) => string;
}

export interface BuildRatedPosterUrlInput {
  profile: RatedPosterServiceProfile;
  apiKey: string;
  kind?: ArtworkKind;
  mediaType?: RatedPosterMediaType;
  tmdbId?: number | string;
  imdbId?: string;
  language?: string;
  /** Override path segment such as `poster-default` (without needing ArtworkKind). */
  kindSegment?: string;
  /** Extra query params (style, ratings_order, …). */
  extraParams?: Record<string, string | undefined>;
}

const RPDB_FULL_LOCALES = [
  'pt-PT',
  'pt-BR',
  'es-ES',
  'es-MX',
  'zh-CN',
  'zh-HK',
  'zh-SG',
  'zh-TW',
] as const;

export function isEnglishLocale(locale: string): boolean {
  const normalized = locale.toLowerCase();
  return normalized === 'en' || normalized.startsWith('en-');
}

export function toRatedPosterLang(
  locale: string,
  mode: RatedPosterLangMode,
): string {
  if (mode === 'full') return locale;
  if ((RPDB_FULL_LOCALES as readonly string[]).includes(locale)) return locale;
  return locale.split('-')[0] || locale;
}

export function artworkKindToPathSegment(
  kind: ArtworkKind,
  backgroundSegment: RatedPosterBackgroundSegment,
): string {
  if (kind === 'background') return `${backgroundSegment}-default`;
  return `${kind}-default`;
}

export function buildTmdbMediaPath(
  mediaType: RatedPosterMediaType,
  tmdbId: number | string,
): string {
  return `${mediaType}-${tmdbId}`;
}

/**
 * Shared URL builder for RPDB-compatible rated-poster hosts
 * (RPDB, AIORatings, OpenPosterDB) and close cousins (Top Posters).
 *
 * Pattern:
 * `{base}/{apiKey}/{idType}/{kindSegment}/{idValue}.{ext}[?…]`
 */
export function buildRatedPosterUrl(input: BuildRatedPosterUrlInput): string {
  const profile = input.profile;
  const baseUrl = profile.baseUrl.replace(/\/$/, '');
  const kindSegment =
    input.kindSegment ??
    artworkKindToPathSegment(input.kind ?? 'poster', profile.backgroundSegment);

  let idValue: string;
  if (profile.idType === 'imdb') {
    if (!input.imdbId) {
      throw new Error(`Rated poster provider ${profile.id} requires an IMDb id`);
    }
    idValue = input.imdbId;
  } else {
    if (input.tmdbId === undefined || input.tmdbId === null) {
      throw new Error(`Rated poster provider ${profile.id} requires a TMDB id`);
    }
    idValue = buildTmdbMediaPath(input.mediaType ?? 'movie', input.tmdbId);
  }

  const url = new URL(
    `${baseUrl}/${input.apiKey}/${profile.idType}/${kindSegment}/${idValue}.${profile.extension}`,
  );

  if (profile.setFallbackQuery) {
    url.searchParams.set('fallback', 'true');
  }

  if (input.language && !isEnglishLocale(input.language)) {
    url.searchParams.set(
      'lang',
      toRatedPosterLang(input.language, profile.langMode),
    );
  }

  if (input.extraParams) {
    for (const [key, value] of Object.entries(input.extraParams)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

/** Canonical service profiles. */
export const RATED_POSTER_PROFILES = {
  rpdb: {
    id: 'rpdb',
    baseUrl: 'https://api.ratingposterdb.com',
    extension: 'png',
    idType: 'tmdb',
    backgroundSegment: 'background',
    setFallbackQuery: true,
    langMode: 'rpdb',
  },
  aioratings: {
    id: 'aioratings',
    baseUrl: 'https://api.aioratings.com',
    extension: 'jpg',
    idType: 'tmdb',
    backgroundSegment: 'background',
    setFallbackQuery: true,
    langMode: 'rpdb',
  },
  openposterdb: {
    id: 'openposterdb',
    baseUrl: 'https://openposterdb.com',
    extension: 'jpg',
    idType: 'tmdb',
    backgroundSegment: 'backdrop',
    setFallbackQuery: true,
    langMode: 'rpdb',
  },
  topposters: {
    id: 'topposters',
    baseUrl: 'https://api.top-streaming.stream',
    extension: 'jpg',
    idType: 'tmdb',
    backgroundSegment: 'background',
    setFallbackQuery: false,
    langMode: 'full',
    verifyPath: (apiKey: string) => `/auth/verify/${apiKey}`,
  },
} as const satisfies Record<string, RatedPosterServiceProfile>;

export type RatedPosterProviderId = keyof typeof RATED_POSTER_PROFILES;
