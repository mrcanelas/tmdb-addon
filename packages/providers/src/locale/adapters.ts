import {
  baseLanguage,
  normalizeLocaleTag,
  type ProviderLocaleAdapter,
  type ProviderLocaleInput,
  type ProviderLocaleParams,
} from './types.js';

/** Providers that only understand a two-letter language code. */
export const languageOnlyLocaleAdapter: ProviderLocaleAdapter = {
  toProviderLocale(input: ProviderLocaleInput): ProviderLocaleParams {
    return {
      language: baseLanguage(input.locale),
      region: input.region?.toUpperCase(),
    };
  },

  supportsLocale(locale: string): boolean {
    return Boolean(baseLanguage(locale));
  },

  getFallbacks(locale: string): string[] {
    const language = baseLanguage(locale);
    return language === 'en' ? ['en'] : [language, 'en'];
  },
};

/** Artwork providers with no language/region support (e.g. some poster APIs). */
export const unsupportedLocaleAdapter: ProviderLocaleAdapter = {
  toProviderLocale(_input: ProviderLocaleInput): ProviderLocaleParams {
    return {};
  },

  supportsLocale(_locale: string): boolean {
    return false;
  },

  getFallbacks(locale: string): string[] {
    return [normalizeLocaleTag(locale)];
  },
};
