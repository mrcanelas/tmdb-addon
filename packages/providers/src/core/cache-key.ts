/**
 * Locale-sensitive cache key fragments for provider and resolved metadata caches.
 * Never include raw secrets — only response-affecting locale/region values.
 */
export function hashFallbackChain(locales: string[]): string {
  return locales.map((locale) => locale.trim().toLowerCase()).filter(Boolean).join('>');
}

export function buildProviderCacheKey(parts: {
  providerId: string;
  operation: string;
  identity?: string;
  locale?: string;
  region?: string;
  fallbackChain?: string[];
  extra?: string;
}): string {
  const segments = [
    parts.providerId,
    parts.operation,
    parts.identity ?? '-',
    parts.locale ?? '-',
    parts.region ?? '-',
    parts.fallbackChain ? hashFallbackChain(parts.fallbackChain) : '-',
    parts.extra ?? '-',
  ];
  return segments.join('|');
}
