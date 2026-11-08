export interface ProviderLocaleInput {
  locale: string;
  region?: string;
}

export interface ProviderLocaleParams {
  language?: string;
  region?: string;
  locale?: string;
}

/**
 * Converts MetaLayer localization preferences into provider-specific query params.
 */
export interface ProviderLocaleAdapter {
  toProviderLocale(input: ProviderLocaleInput): ProviderLocaleParams;
  supportsLocale(locale: string): boolean;
  getFallbacks(locale: string): string[];
}

export function baseLanguage(locale: string): string {
  const normalized = locale.trim().replace(/_/g, '-');
  const [language] = normalized.split('-');
  return language?.toLowerCase() || 'en';
}

export function normalizeLocaleTag(locale: string): string {
  const parts = locale.trim().replace(/_/g, '-').split('-').filter(Boolean);
  if (parts.length === 0) return 'en-US';
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}${
    parts.length > 2 ? `-${parts.slice(2).join('-')}` : ''
  }`;
}
