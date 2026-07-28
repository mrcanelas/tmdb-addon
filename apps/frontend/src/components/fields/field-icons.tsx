import { useState } from 'react';
import { CircleFlag } from 'react-circle-flags';
import { Globe } from 'lucide-react';
import type { LocalePreference } from '@metalayer/config';
import { sourceIconUrl } from '@/lib/source-presentation';
import { cn } from '@/lib/utils';

/**
 * Provider brand glyph for Field Resolution Chains.
 * Reuses the Sources icon set (simpleicons CDN where available, brand logos
 * otherwise) so every provider renders — including tmdb/tvdb/fanart/rpdb that
 * have no simple-icons entry — and falls back to a lettered tile.
 */
export function ProviderGlyph({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const url = sourceIconUrl(provider);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={cn(
          'size-5 shrink-0 rounded-[4px] object-cover',
          className,
        )}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[var(--default)] text-[10px] font-semibold text-[var(--foreground)]',
        className,
      )}
    >
      {provider.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Language-only fallback when a BCP47 tag carries no explicit region. */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'us',
  pt: 'br',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'jp',
  ko: 'kr',
  zh: 'cn',
  ru: 'ru',
  ar: 'sa',
  tr: 'tr',
  uk: 'ua',
  nl: 'nl',
  pl: 'pl',
  sv: 'se',
  hi: 'in',
};

function localeCountryCode(locale: LocalePreference): string | null {
  if (locale.type !== 'locale') return null;
  const parts = locale.value.split('-');
  const region = parts[parts.length - 1];
  if (parts.length > 1 && region.length === 2) {
    return region.toLowerCase();
  }
  return LANGUAGE_TO_COUNTRY[parts[0]?.toLowerCase() ?? ''] ?? null;
}

/**
 * Circular flag for a locale preference. Non-locale preferences (original /
 * any / no-language / provider-default) render a neutral globe glyph.
 */
export function LocaleFlag({
  locale,
  className,
}: {
  locale?: LocalePreference;
  className?: string;
}) {
  const country = locale ? localeCountryCode(locale) : null;

  if (country) {
    return (
      <CircleFlag
        countryCode={country}
        height="20"
        aria-hidden
        className={cn('size-5 shrink-0 rounded-full', className)}
      />
    );
  }

  return (
    <Globe
      className={cn('size-5 shrink-0 text-[var(--muted-foreground)]', className)}
      aria-hidden
    />
  );
}
