import { z } from 'zod';
import {
  DEFAULT_FIELD_PROVIDERS,
  ResolvableFieldSchema,
  type FieldProviders,
  type ResolvableField,
} from './schema.js';

/** AGENTS.md §10 — Field Resolution Chains schemas. */

export const LocalePreferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('locale'),
    value: z.string().min(2),
  }),
  z.object({ type: z.literal('original-language') }),
  z.object({ type: z.literal('no-language') }),
  z.object({ type: z.literal('any-language') }),
  z.object({ type: z.literal('provider-default') }),
]);

export const RegionPreferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('region'),
    value: z.string().length(2),
  }),
  z.object({ type: z.literal('configuration-region') }),
  z.object({ type: z.literal('profile-region') }),
  z.object({ type: z.literal('provider-default') }),
]);

export const ResolutionStrategySchema = z.enum([
  'locale-first',
  'provider-first',
  'explicit',
]);

export const EpisodeOrderTypeSchema = z.enum([
  'aired',
  'absolute',
  'dvd',
  'production',
  'provider-default',
  'community-corrected',
]);

export const ArtworkTypeSchema = z.enum([
  'poster',
  'background',
  'logo',
  'episode-thumbnail',
]);

export const ResolutionStepSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  locale: LocalePreferenceSchema.optional(),
  region: RegionPreferenceSchema.optional(),
  orderType: EpisodeOrderTypeSchema.optional(),
  imageType: ArtworkTypeSchema.optional(),
  minimumConfidence: z.number().min(0).max(1).optional(),
  required: z.boolean().optional(),
  enabled: z.boolean().default(true),
});

export const FieldResolutionPlanSchema = z
  .object({
    version: z.literal(1),
    strategy: ResolutionStrategySchema,
    providers: z.array(z.string().min(1)).optional(),
    locales: z.array(LocalePreferenceSchema).optional(),
    regions: z.array(RegionPreferenceSchema).optional(),
    steps: z.array(ResolutionStepSchema).optional(),
    skipEmpty: z.boolean().default(true),
    skipInvalid: z.boolean().default(true),
    minimumConfidence: z.number().min(0).max(1).optional(),
    useGlobalFallback: z.boolean().optional(),
    useProviderDefaultFallback: z.boolean().optional(),
    stopAfterFirstValid: z.boolean().default(true),
  })
  .superRefine((plan, ctx) => {
    if (plan.strategy === 'explicit') {
      if (!plan.steps || plan.steps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'explicit strategy requires steps',
          path: ['steps'],
        });
      }
      return;
    }
    if (!plan.providers || plan.providers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${plan.strategy} strategy requires providers`,
        path: ['providers'],
      });
    }
  });

export const MediaResolutionConfigSchema = z.object({
  fields: z.record(FieldResolutionPlanSchema).default({}),
});

export const ResolutionConfigSchema = z.object({
  version: z.literal(1),
  defaults: MediaResolutionConfigSchema.default({ fields: {} }),
  mediaTypes: z
    .object({
      movie: MediaResolutionConfigSchema.optional(),
      series: MediaResolutionConfigSchema.optional(),
      anime: MediaResolutionConfigSchema.optional(),
    })
    .default({}),
});

export type LocalePreference = z.infer<typeof LocalePreferenceSchema>;
export type RegionPreference = z.infer<typeof RegionPreferenceSchema>;
export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>;
export type ResolutionStep = z.infer<typeof ResolutionStepSchema>;
export type FieldResolutionPlan = z.infer<typeof FieldResolutionPlanSchema>;
export type MediaResolutionConfig = z.infer<typeof MediaResolutionConfigSchema>;
export type ResolutionConfig = z.infer<typeof ResolutionConfigSchema>;

export function parseResolutionConfig(input: unknown): ResolutionConfig {
  return ResolutionConfigSchema.parse(input);
}

/**
 * Build a provider-first plan from a legacy ordered provider chain.
 * Locales default to preferred metadata locale → en-US → original-language.
 */
export function planFromProviderChain(
  providers: string[],
  locales: LocalePreference[] = [
    { type: 'locale', value: 'en-US' },
    { type: 'original-language' },
  ],
  strategy: ResolutionStrategy = 'provider-first',
): FieldResolutionPlan {
  return FieldResolutionPlanSchema.parse({
    version: 1,
    strategy,
    providers,
    locales,
    skipEmpty: true,
    skipInvalid: true,
    stopAfterFirstValid: true,
  });
}

/** Convert legacy `fieldProviders` map into a ResolutionConfig defaults block. */
export function resolutionConfigFromFieldProviders(
  fieldProviders: FieldProviders,
  metadataLocale = 'en-US',
  fallbackLocales: string[] = [],
): ResolutionConfig {
  const locales: LocalePreference[] = [
    { type: 'locale', value: metadataLocale },
    ...fallbackLocales.map((value) => ({
      type: 'locale' as const,
      value,
    })),
    { type: 'original-language' },
  ];

  const fields: Record<string, FieldResolutionPlan> = {};
  for (const field of ResolvableFieldSchema.options) {
    const providers =
      fieldProviders[field] ?? DEFAULT_FIELD_PROVIDERS[field] ?? ['tmdb'];
    const strategy =
      field === 'title' || field === 'description' || field === 'originalTitle'
        ? 'locale-first'
        : 'provider-first';
    fields[field] = planFromProviderChain(providers, locales, strategy);
  }

  return ResolutionConfigSchema.parse({
    version: 1,
    defaults: { fields },
    mediaTypes: {},
  });
}

export function defaultResolutionConfig(
  metadataLocale = 'en-US',
): ResolutionConfig {
  return resolutionConfigFromFieldProviders(
    DEFAULT_FIELD_PROVIDERS,
    metadataLocale,
  );
}

export function getPlanForField(
  config: ResolutionConfig,
  field: ResolvableField | string,
  mediaType?: 'movie' | 'series' | 'anime',
): FieldResolutionPlan | undefined {
  const mediaOverride = mediaType
    ? config.mediaTypes[mediaType]?.fields[field]
    : undefined;
  return mediaOverride ?? config.defaults.fields[field];
}
