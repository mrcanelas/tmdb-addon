import type { FieldResolutionPlan, ResolutionConfig } from '@metalayer/config';
import { planFromProviderChain } from '@metalayer/config';

export const APPEARANCE_EDIT_FIELDS = [
  'title',
  'description',
  'poster',
  'background',
] as const;

export type AppearanceEditField = (typeof APPEARANCE_EDIT_FIELDS)[number];

export function isArtworkField(
  field: AppearanceEditField,
): field is 'poster' | 'background' {
  return field === 'poster' || field === 'background';
}

/**
 * Default Field Resolution Plan for Appearance Studio when none is stored.
 * Artwork chains include `no-language` for textless posters/backgrounds.
 */
export function ensureAppearancePlan(
  resolution: ResolutionConfig,
  field: AppearanceEditField,
): FieldResolutionPlan {
  const existing = resolution.defaults.fields[field];
  if (existing) return existing;
  if (field === 'title' || field === 'description') {
    return planFromProviderChain(
      ['tmdb', 'tvdb'],
      [
        { type: 'locale', value: 'pt-BR' },
        { type: 'locale', value: 'en-US' },
        { type: 'original-language' },
      ],
      'locale-first',
    );
  }
  const providers =
    field === 'background'
      ? (['fanart', 'tmdb', 'rpdb'] as const)
      : (['rpdb', 'fanart', 'tmdb'] as const);
  return planFromProviderChain(
    [...providers],
    [
      { type: 'locale', value: 'pt-BR' },
      { type: 'no-language' },
      { type: 'locale', value: 'en-US' },
    ],
    'locale-first',
  );
}
