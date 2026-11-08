import type {
  LocalePreference,
  LocalizationPreferences,
  PresentationConfig,
} from '@metalayer/config';
import { localePreferencesFromLocalization } from '@metalayer/config';

/**
 * Stremio-like meta payload after field resolution.
 * Keep loose so applyPresentation can run before every field is resolvable.
 */
export interface PresentableMeta {
  name?: string;
  description?: string | null;
  poster?: string | null;
  background?: string | null;
  logo?: string | null;
  genres?: string[];
  cast?: string[];
  director?: string[];
  imdbRating?: string | number | null;
  certification?: string | null;
  videos?: Array<{
    id: string;
    thumbnail?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface ApplyPresentationResult {
  meta: PresentableMeta;
  /** Warnings explaining deferred runtime effects (§4.3). */
  warnings: string[];
}

function truncateList(
  values: string[] | undefined,
  limit: number | undefined,
): string[] | undefined {
  if (!values) return values;
  if (limit === undefined) return values;
  return values.slice(0, Math.max(0, limit));
}

/**
 * Pure presentation layer between resolved metadata and Stremio serialization.
 * Safe to call even when native routes still build meta without the resolver.
 */
export function applyPresentation(
  meta: PresentableMeta,
  presentation: PresentationConfig,
  _localization?: LocalizationPreferences,
): ApplyPresentationResult {
  const warnings: string[] = [];
  const next: PresentableMeta = {
    ...meta,
    genres: meta.genres ? [...meta.genres] : undefined,
    cast: meta.cast ? [...meta.cast] : undefined,
    director: meta.director ? [...meta.director] : undefined,
    videos: meta.videos?.map((video) => ({ ...video })),
  };

  if (presentation.castCount !== undefined) {
    next.cast = truncateList(next.cast, presentation.castCount);
  }

  if (presentation.showAgeRatingInGenres) {
    const certification =
      typeof next.certification === 'string' ? next.certification.trim() : '';
    if (certification) {
      const genres = next.genres ?? [];
      if (!genres.includes(certification)) {
        next.genres = [certification, ...genres];
      }
    } else {
      warnings.push('presentation.showAgeRatingInGenres.missingCertification');
    }
  }

  if (presentation.hideEpisodeSpoilers) {
    warnings.push('presentation.hideEpisodeSpoilers.pendingRuntime');
  }

  if (presentation.ratingPostersForLibrary) {
    warnings.push('presentation.ratingPostersForLibrary.pendingRuntime');
  }

  return { meta: next, warnings };
}

export { localePreferencesFromLocalization };
export type { LocalePreference };
