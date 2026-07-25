import type { FieldResolutionPlan, ResolutionConfig } from '@metalayer/config';
import { planFromProviderChain } from '@metalayer/config';
import {
  getFieldEntry,
  listResolutionFields,
  type FieldRailId,
} from './field-registry.js';

export type EditableFieldId = Extract<
  FieldRailId,
  | 'title'
  | 'originalTitle'
  | 'description'
  | 'poster'
  | 'background'
  | 'logo'
  | 'rating'
  | 'voteCount'
  | 'releaseDate'
  | 'externalIds'
>;

/** @deprecated Prefer EDITABLE_FIELD_IDS / field-registry. */
export const APPEARANCE_EDIT_FIELDS = [
  'title',
  'description',
  'poster',
  'background',
  'logo',
] as const;

/** @deprecated Prefer EditableFieldId. */
export type AppearanceEditField = (typeof APPEARANCE_EDIT_FIELDS)[number];

export const EDITABLE_FIELD_IDS = listResolutionFields().map(
  (entry) => entry.id,
) as EditableFieldId[];

export function isArtworkField(
  field: string,
): field is 'poster' | 'background' | 'logo' {
  return field === 'poster' || field === 'background' || field === 'logo';
}

export function isLocalizedField(field: string): boolean {
  return (
    field === 'title' ||
    field === 'originalTitle' ||
    field === 'description' ||
    field === 'tagline'
  );
}

/**
 * Default Field Resolution Plan when none is stored.
 * Artwork chains include `no-language` for textless assets.
 */
export function ensureFieldPlan(
  resolution: ResolutionConfig,
  field: EditableFieldId | AppearanceEditField,
): FieldResolutionPlan {
  const existing = resolution.defaults.fields[field];
  if (existing) return existing;

  const entry = getFieldEntry(field);
  const providers = entry?.providerOptions ?? ['tmdb'];

  if (isArtworkField(field)) {
    const artworkProviders =
      field === 'background'
        ? (['fanart', 'tmdb', 'rpdb', 'aioratings', 'openposterdb'] as const)
        : field === 'logo'
          ? ([
              'rpdb',
              'topposters',
              'aioratings',
              'openposterdb',
              'fanart',
              'tmdb',
              'tvdb',
            ] as const)
          : ([
              'rpdb',
              'topposters',
              'aioratings',
              'openposterdb',
              'fanart',
              'tmdb',
            ] as const);
    return planFromProviderChain(
      [...artworkProviders],
      [
        { type: 'locale', value: 'pt-BR' },
        { type: 'no-language' },
        { type: 'locale', value: 'en-US' },
      ],
      'locale-first',
    );
  }

  if (isLocalizedField(field)) {
    return planFromProviderChain(
      providers.slice(0, 3),
      [
        { type: 'locale', value: 'pt-BR' },
        { type: 'locale', value: 'en-US' },
        { type: 'original-language' },
      ],
      'locale-first',
    );
  }

  return planFromProviderChain(
    providers.slice(0, 3),
    [{ type: 'provider-default' }],
    'provider-first',
  );
}

/** @deprecated Prefer ensureFieldPlan. */
export function ensureAppearancePlan(
  resolution: ResolutionConfig,
  field: AppearanceEditField,
): FieldResolutionPlan {
  return ensureFieldPlan(resolution, field);
}

export function resetFieldPlan(
  field: EditableFieldId | AppearanceEditField,
): FieldResolutionPlan {
  return ensureFieldPlan(
    { version: 1, defaults: { fields: {} }, mediaTypes: {} },
    field,
  );
}
