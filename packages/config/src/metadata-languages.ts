import fallbackLanguages from './data/fallback-languages.json' with { type: 'json' };

export interface MetadataLanguageOption {
  /** BCP 47 tag used by providers and Field Resolution Chains. */
  value: string;
  /** English catalog name from TMDB (UI may re-localize via Intl). */
  name: string;
}

type FallbackEntry = { iso_639_1: string; name: string };

/**
 * Catalog of metadata locales available for Field Resolution Chains.
 * Mirrors the legacy TMDB Addon `getLanguages` fallback list.
 */
export const METADATA_LANGUAGE_OPTIONS: MetadataLanguageOption[] = (
  fallbackLanguages as FallbackEntry[]
).map((entry) => ({
  value: entry.iso_639_1,
  name: entry.name,
}));

export function listMetadataLanguages(): MetadataLanguageOption[] {
  return METADATA_LANGUAGE_OPTIONS;
}

export function findMetadataLanguage(
  value: string,
): MetadataLanguageOption | undefined {
  const normalized = value.trim();
  return METADATA_LANGUAGE_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalized.toLowerCase(),
  );
}
