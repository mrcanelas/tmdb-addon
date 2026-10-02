import type {
  EpisodeOrderType,
  FieldResolutionPlan,
  LocalePreference,
  ResolutionConfig,
  ResolutionStep,
  ResolvableField,
} from '@metalayer/config';
import {
  FieldResolutionPlanSchema,
  defaultOrderTypesForMediaType,
  getPlanForField,
  isEpisodeStructureField,
  resolutionConfigFromFieldProviders,
  type FieldProviders,
} from '@metalayer/config';
import type { ResolutionWarning } from './field.js';

export interface EffectiveResolutionPlan extends FieldResolutionPlan {
  field: string;
  mediaType?: 'movie' | 'series' | 'anime';
  generatedSteps: ResolutionStep[];
  warnings: ResolutionWarning[];
  effectivePlanHash: string;
  source: 'resolution-config' | 'field-providers';
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

/** FNV-1a 32-bit — deterministic without Node crypto (safe for UI imports). */
export function hashEffectivePlan(plan: unknown): string {
  const input = stableStringify(plan);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function defaultLocales(
  metadataLocale?: string,
  fallbackLocales: string[] = [],
): LocalePreference[] {
  const locales: LocalePreference[] = [];
  if (metadataLocale) {
    locales.push({ type: 'locale', value: metadataLocale });
  }
  for (const value of fallbackLocales) {
    if (!locales.some((item) => item.type === 'locale' && item.value === value)) {
      locales.push({ type: 'locale', value });
    }
  }
  locales.push({ type: 'original-language' });
  return locales;
}

export function expandPlanSteps(plan: FieldResolutionPlan): ResolutionStep[] {
  const parsed = FieldResolutionPlanSchema.parse(plan);

  if (parsed.strategy === 'explicit') {
    return (parsed.steps ?? []).filter((step) => step.enabled !== false);
  }

  const providers = parsed.providers ?? [];
  const locales =
    parsed.locales && parsed.locales.length > 0
      ? parsed.locales
      : ([{ type: 'any-language' }] as LocalePreference[]);
  // Episode-order preferences expand onto every provider × locale attempt
  // (AGENTS.md §10.11). Plans without orderTypes keep a single untyped pass.
  const orderTypes: Array<EpisodeOrderType | undefined> =
    parsed.orderTypes && parsed.orderTypes.length > 0
      ? parsed.orderTypes
      : [undefined];

  const steps: ResolutionStep[] = [];
  let index = 0;
  const push = (
    provider: string,
    locale: LocalePreference,
    orderType: EpisodeOrderType | undefined,
  ) => {
    steps.push({
      id: `${provider}-${index++}`,
      provider,
      locale,
      ...(orderType ? { orderType } : {}),
      enabled: true,
    });
  };

  if (parsed.strategy === 'locale-first') {
    for (const locale of locales) {
      for (const provider of providers) {
        for (const orderType of orderTypes) push(provider, locale, orderType);
      }
    }
  } else {
    for (const provider of providers) {
      for (const orderType of orderTypes) {
        for (const locale of locales) push(provider, locale, orderType);
      }
    }
  }

  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.provider}|${stableStringify(step.locale ?? null)}|${step.orderType ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function compileResolutionPlan(input: {
  field: ResolvableField | string;
  mediaType?: 'movie' | 'series' | 'anime';
  resolution?: ResolutionConfig | null;
  fieldProviders?: FieldProviders;
  metadataLocale?: string;
  fallbackLocales?: string[];
}): EffectiveResolutionPlan {
  const warnings: ResolutionWarning[] = [];
  let plan: FieldResolutionPlan | undefined;
  let source: EffectiveResolutionPlan['source'] = 'resolution-config';

  if (input.resolution) {
    plan = getPlanForField(input.resolution, input.field, input.mediaType);
  }

  if (!plan) {
    source = 'field-providers';
    const derived = resolutionConfigFromFieldProviders(
      input.fieldProviders ?? {},
      input.metadataLocale ?? 'en-US',
      input.fallbackLocales ?? [],
    );
    plan = getPlanForField(derived, input.field, input.mediaType);
    warnings.push({
      code: 'DERIVED_FROM_FIELD_PROVIDERS',
    });
  }

  if (!plan) {
    plan = FieldResolutionPlanSchema.parse({
      version: 1,
      strategy: 'provider-first',
      providers: ['tmdb'],
      locales: defaultLocales(input.metadataLocale, input.fallbackLocales),
      skipEmpty: true,
      skipInvalid: true,
      stopAfterFirstValid: true,
    });
  }

  if (
    plan.strategy !== 'explicit' &&
    (!plan.locales || plan.locales.length === 0) &&
    input.metadataLocale
  ) {
    plan = {
      ...plan,
      locales: defaultLocales(input.metadataLocale, input.fallbackLocales),
    };
  }

  if (
    plan.strategy !== 'explicit' &&
    isEpisodeStructureField(String(input.field)) &&
    (!plan.orderTypes || plan.orderTypes.length === 0)
  ) {
    plan = {
      ...plan,
      orderTypes: defaultOrderTypesForMediaType(input.mediaType),
    };
  }

  const generatedSteps = expandPlanSteps(plan);
  const effectivePlanHash = hashEffectivePlan({
    field: input.field,
    mediaType: input.mediaType,
    plan,
    generatedSteps,
  });

  return {
    ...plan,
    field: input.field,
    mediaType: input.mediaType,
    generatedSteps,
    warnings,
    effectivePlanHash,
    source,
  };
}
