import {
  baseLanguage,
  normalizeLocaleTag,
  type ProviderLocaleAdapter,
  type ProviderLocaleInput,
  type ProviderLocaleParams,
} from './types.js';

/**
 * TMDB accepts BCP-47-like `language` (e.g. pt-BR) and ISO region separately.
 */
export const tmdbLocaleAdapter: ProviderLocaleAdapter = {
  toProviderLocale(input: ProviderLocaleInput): ProviderLocaleParams {
    const language = normalizeLocaleTag(input.locale);
    const region =
      input.region?.toUpperCase() ||
      (language.includes('-') ? language.split('-')[1] : undefined);
    return {
      language,
      region,
    };
  },

  supportsLocale(locale: string): boolean {
    return Boolean(baseLanguage(locale));
  },

  getFallbacks(locale: string): string[] {
    const normalized = normalizeLocaleTag(locale);
    const language = baseLanguage(normalized);
    const fallbacks = [normalized];
    if (language !== normalized) fallbacks.push(language);
    if (language !== 'en') fallbacks.push('en-US', 'en');
    return [...new Set(fallbacks)];
  },
};
