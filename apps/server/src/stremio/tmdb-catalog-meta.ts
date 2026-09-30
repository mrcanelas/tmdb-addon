import type { CatalogMetaPreview } from '@metalayer/catalogs';
import type { TmdbCatalogItem } from '@metalayer/providers';

/** TMDB list genre ids → English display names (movies + TV overlap). */
const TMDB_GENRE_NAMES: Record<number, string> = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Science Fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  10770: 'TV Movie',
};

export function tmdbGenreNames(genreIds?: number[]): string[] | undefined {
  if (!genreIds?.length) return undefined;
  const names = genreIds
    .map((id) => TMDB_GENRE_NAMES[id])
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : undefined;
}

export function yearFromReleaseInfo(
  releaseInfo?: string,
): number | undefined {
  if (!releaseInfo || releaseInfo.length < 4) return undefined;
  const year = Number(releaseInfo.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export function isReleasedByDate(
  releaseInfo?: string,
  now: Date = new Date(),
): boolean | undefined {
  if (!releaseInfo) return undefined;
  const stamp = Date.parse(releaseInfo);
  if (!Number.isFinite(stamp)) return undefined;
  return stamp <= now.getTime();
}

export function tmdbCatalogItemToMetaPreview(
  item: TmdbCatalogItem,
  posterUrl?: string,
  now: Date = new Date(),
): CatalogMetaPreview {
  const released = isReleasedByDate(item.releaseDate, now);
  return {
    id: item.publicId,
    type: item.mediaType,
    name: item.name,
    poster: posterUrl,
    releaseInfo: item.releaseDate,
    provider: 'tmdb',
    facts: { popularity: item.popularity, originalTitle: item.originalTitle },
    adult: item.adult,
    genres: tmdbGenreNames(item.genreIds),
    overview: item.overview,
    rating: item.voteAverage,
    voteCount: item.voteCount,
    year: yearFromReleaseInfo(item.releaseDate),
    released,
    // List endpoints do not expose digital release; leave unknown.
    digitallyReleased: undefined,
    originalLanguage: item.originalLanguage,
    hasArtwork: Boolean(posterUrl ?? item.posterPath),
  };
}
