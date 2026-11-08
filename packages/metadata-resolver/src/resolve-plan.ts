import type { LocalePreference } from '@metalayer/config';
import {
  type FieldContribution,
  type FieldResolution,
  type ResolutionWarning,
} from './field.js';
import type { EffectiveResolutionPlan } from './compile.js';

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
  localePreference?: LocalePreference;
  resolvedLocale?: string;
  status: FieldAttemptStatus;
  confidence?: number;
  /** Stable reason code for Meta Inspector i18n (not a user-facing sentence). */
  reason?: string;
  reasonParams?: Record<string, string | number>;
}

function isPresent<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function matchesLocalePreference(
  contribution: FieldContribution<unknown>,
  preference: LocalePreference | undefined,
  originalLanguage?: string,
): boolean {
  if (!preference) return true;

  switch (preference.type) {
    case 'any-language':
    case 'provider-default':
      return true;
    case 'no-language':
      return !contribution.locale;
    case 'original-language':
      if (!originalLanguage) {
        // Without known original language, accept unlabeled or any contribution once.
        return true;
      }
      return contribution.locale === originalLanguage;
    case 'locale':
      return contribution.locale === preference.value;
    default:
      return true;
  }
}

/**
 * Resolve a field by walking compiled plan steps against contributions.
 * Emits full attempt history for Meta Inspector (AGENTS.md §10 / §11).
 */
export function resolveFieldFromPlan<T>(
  contributions: FieldContribution<T>[],
  plan: EffectiveResolutionPlan,
  options: {
    originalLanguage?: string;
    now?: Date;
  } = {},
): FieldResolution<T> & {
  attempts: FieldResolutionAttempt[];
  effectivePlanHash: string;
} {
  const resolvedAt = (options.now ?? new Date()).toISOString();
  const attempts: FieldResolutionAttempt[] = [];
  const warnings: ResolutionWarning[] = [...plan.warnings];
  const attemptedProviders: string[] = [];
  for (const step of plan.generatedSteps) {
    if (!attemptedProviders.includes(step.provider)) {
      attemptedProviders.push(step.provider);
    }
  }

  let selected: FieldContribution<T> | null = null;
  let selectedIndex = -1;

  for (let index = 0; index < plan.generatedSteps.length; index += 1) {
    const step = plan.generatedSteps[index]!;

    const matches = contributions.filter(
      (item) =>
        item.provider === step.provider &&
        matchesLocalePreference(item, step.locale, options.originalLanguage),
    );

    if (matches.length === 0) {
      attempts.push({
        index,
        stepId: step.id,
        provider: step.provider,
        localePreference: step.locale,
        status: 'not-found',
        reason: 'NO_CONTRIBUTION',
      });
      if (step.required) break;
      continue;
    }

    const usable = matches.find((item) => isPresent(item.value));
    if (!usable) {
      attempts.push({
        index,
        stepId: step.id,
        provider: step.provider,
        localePreference: step.locale,
        resolvedLocale: matches[0]?.locale,
        status: 'empty',
        reason: plan.skipEmpty ? 'EMPTY_SKIPPED' : 'EMPTY',
      });
      if (step.required) break;
      continue;
    }

    const confidence = usable.confidence ?? 0.8;
    const minimum = step.minimumConfidence ?? plan.minimumConfidence;
    if (minimum != null && confidence < minimum) {
      attempts.push({
        index,
        stepId: step.id,
        provider: step.provider,
        localePreference: step.locale,
        resolvedLocale: usable.locale,
        status: 'below-confidence',
        confidence,
        reason: 'BELOW_CONFIDENCE',
        reasonParams: { confidence, minimum },
      });
      if (step.required) break;
      continue;
    }

    attempts.push({
      index,
      stepId: step.id,
      provider: step.provider,
      localePreference: step.locale,
      resolvedLocale: usable.locale,
      status: 'selected',
      confidence,
    });
    selected = usable;
    selectedIndex = index;
    if (plan.stopAfterFirstValid !== false) break;
  }

  if (!selected) {
    return {
      value: null,
      selectedProvider: null,
      attemptedProviders,
      confidence: 0,
      fallbackUsed: false,
      warnings,
      resolvedAt,
      exclusionReason: 'UNRESOLVED',
      attempts,
      effectivePlanHash: plan.effectivePlanHash,
    };
  }

  const fallbackUsed = selectedIndex > 0;
  if (fallbackUsed) {
    warnings.push({
      code: 'RESOLUTION_FALLBACK',
      params: { index: selectedIndex },
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
    selectedLocale: selected.locale,
    attempts,
    effectivePlanHash: plan.effectivePlanHash,
  };
}
