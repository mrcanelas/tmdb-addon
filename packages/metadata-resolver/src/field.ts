export interface ResolutionWarning {
  code: string;
  message: string;
}

export interface FieldContribution<T> {
  provider: string;
  value: T | null | undefined;
  /** BCP 47 locale of this contribution when language-sensitive. */
  locale?: string;
  confidence?: number;
}

export interface FieldResolution<T> {
  value: T | null;
  selectedProvider: string | null;
  attemptedProviders: string[];
  confidence: number;
  fallbackUsed: boolean;
  warnings: ResolutionWarning[];
  resolvedAt: string;
  requestedLocale?: string;
  selectedLocale?: string;
  /** Present when no value could be selected. */
  exclusionReason?: string;
  /** Field Resolution Chains attempt history (AGENTS.md §10). */
  attempts?: FieldResolutionAttempt[];
  effectivePlanHash?: string;
}

export type FieldAttemptStatus =
  | 'selected'
  | 'empty'
  | 'not-found'
  | 'skipped'
  | 'below-confidence';

export interface FieldResolutionAttempt {
  index: number;
  stepId: string;
  provider: string;
  localePreference?: unknown;
  resolvedLocale?: string;
  status: FieldAttemptStatus;
  confidence?: number;
  /** Stable reason code for Meta Inspector i18n (not a user-facing sentence). */
  reason?: string;
  reasonParams?: Record<string, string | number>;
}

export type ResolutionPolicy =
  | 'first-valid'
  | 'highest-confidence'
  | 'preferred-language';

function isPresent<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function localeRank(
  locale: string | undefined,
  requested: string | undefined,
  fallbacks: string[],
): number {
  if (!locale) return 1000;
  if (requested && locale === requested) return 0;
  const idx = fallbacks.indexOf(locale);
  if (idx >= 0) return idx + 1;
  if (requested && locale.split('-')[0] === requested.split('-')[0]) return 50;
  return 100;
}

/**
 * Resolve one field from ordered provider contributions (AGENTS.md §10.4).
 * Multiple contributions from the same provider (e.g. locale variants) are kept.
 */
export function resolveField<T>(
  contributions: FieldContribution<T>[],
  chain: string[],
  options: {
    policy?: ResolutionPolicy;
    requestedLocale?: string;
    fallbackLocales?: string[];
    now?: Date;
  } = {},
): FieldResolution<T> {
  const policy = options.policy ?? 'first-valid';
  const fallbackLocales = options.fallbackLocales ?? [];
  const resolvedAt = (options.now ?? new Date()).toISOString();
  const attemptedProviders = [...chain];
  const warnings: ResolutionWarning[] = [];

  const ordered: FieldContribution<T>[] = [];
  for (const provider of chain) {
    for (const item of contributions) {
      if (item.provider === provider) ordered.push(item);
    }
  }

  const candidates = ordered.filter((item) => isPresent(item.value));

  if (candidates.length === 0) {
    return {
      value: null,
      selectedProvider: null,
      attemptedProviders,
      confidence: 0,
      fallbackUsed: false,
      warnings,
      resolvedAt,
      requestedLocale: options.requestedLocale,
      exclusionReason: 'UNRESOLVED',
    };
  }

  let selected: FieldContribution<T>;
  if (policy === 'highest-confidence') {
    selected = [...candidates].sort(
      (a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5),
    )[0]!;
  } else if (policy === 'preferred-language' && options.requestedLocale) {
    selected = [...candidates].sort((a, b) => {
      const localeDiff =
        localeRank(a.locale, options.requestedLocale, fallbackLocales) -
        localeRank(b.locale, options.requestedLocale, fallbackLocales);
      if (localeDiff !== 0) return localeDiff;
      // Prefer earlier chain position on locale ties.
      return ordered.indexOf(a) - ordered.indexOf(b);
    })[0]!;
  } else {
    selected = candidates[0]!;
  }

  const preferredLocale = options.requestedLocale;
  const fallbackUsed = Boolean(
    preferredLocale && selected.locale && selected.locale !== preferredLocale,
  );

  if (fallbackUsed) {
    warnings.push({
      code: 'LOCALE_FALLBACK',
      message: `Requested ${preferredLocale}, selected ${selected.locale}`,
    });
  }

  return {
    value: selected.value as T,
    selectedProvider: selected.provider,
    attemptedProviders,
    confidence: selected.confidence ?? 0.8,
    fallbackUsed,
    warnings,
    resolvedAt,
    requestedLocale: options.requestedLocale,
    selectedLocale: selected.locale,
  };
}
