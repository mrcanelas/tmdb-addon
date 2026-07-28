import type { LocalePreference } from './resolution.js';
import type { LocalizationPreferences } from './schema.js';

/** Build ordered locale preferences from localization settings. */
export function localePreferencesFromLocalization(
  localization: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
  options: { includeOriginal?: boolean; includeNoLanguage?: boolean } = {},
): LocalePreference[] {
  const locales: LocalePreference[] = [];
  const seen = new Set<string>();

  const pushLocale = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    locales.push({ type: 'locale', value: trimmed });
  };

  pushLocale(localization.metadataLocale);
  for (const fallback of localization.metadataFallbackLocales) {
    pushLocale(fallback);
  }

  if (options.includeNoLanguage) {
    locales.push({ type: 'no-language' });
  }
  if (options.includeOriginal !== false) {
    locales.push({ type: 'original-language' });
  }

  return locales;
}
