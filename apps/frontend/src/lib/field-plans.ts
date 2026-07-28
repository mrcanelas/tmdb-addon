import type {
  FieldResolutionPlan,
  LocalePreference,
  LocalizationPreferences,
  ResolutionConfig,
} from '@metalayer/config';
import {
  localePreferencesFromLocalization,
  planFromProviderChain,
} from '@metalayer/config';
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

export function defaultLocalesForField(
  field: string,
  localization?: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
): LocalePreference[] {
  const localizationOrDefault = localization ?? {
    metadataLocale: 'en-US',
    metadataFallbackLocales: localization ? [] : ['en-US'],
  };

  if (isArtworkField(field)) {
    return localePreferencesFromLocalization(localizationOrDefault, {
      includeNoLanguage: true,
      includeOriginal: true,
    });
  }

  if (isLocalizedField(field)) {
    return localePreferencesFromLocalization(localizationOrDefault, {
      includeOriginal: true,
    });
  }

  return [{ type: 'provider-default' }];
}

/**
 * Default Field Resolution Plan when none is stored.
 * Artwork chains include `no-language` for textless assets.
 * Locales seed from localization preferences when provided.
 */
export function ensureFieldPlan(
  resolution: ResolutionConfig,
  field: EditableFieldId | AppearanceEditField,
  localization?: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
): FieldResolutionPlan {
  const existing = resolution.defaults.fields[field];
  if (existing) return coerceToSimplePlan(existing);

  const entry = getFieldEntry(field);
  const providers = entry?.providerOptions ?? ['tmdb'];
  const locales = defaultLocalesForField(field, localization);

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
      locales,
      'locale-first',
    );
  }

  if (isLocalizedField(field)) {
    return planFromProviderChain(
      providers.slice(0, 3),
      locales,
      'locale-first',
    );
  }

  return planFromProviderChain(
    providers.slice(0, 3),
    locales,
    'provider-first',
  );
}

/** @deprecated Prefer ensureFieldPlan. */
export function ensureAppearancePlan(
  resolution: ResolutionConfig,
  field: AppearanceEditField,
  localization?: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
): FieldResolutionPlan {
  return ensureFieldPlan(resolution, field, localization);
}

export function resetFieldPlan(
  field: EditableFieldId | AppearanceEditField,
  localization?: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
): FieldResolutionPlan {
  return ensureFieldPlan(
    { version: 1, defaults: { fields: {} }, mediaTypes: {} },
    field,
    localization,
  );
}

/**
 * Apply localization language order onto every default field plan that still
 * uses the simple strategy (locale-first / provider-first).
 */
export function applyLocalizationLocalesToResolution(
  resolution: ResolutionConfig,
  localization: Pick<
    LocalizationPreferences,
    'metadataLocale' | 'metadataFallbackLocales'
  >,
): ResolutionConfig {
  const fields = { ...resolution.defaults.fields };
  for (const entry of listResolutionFields()) {
    const field = entry.id as EditableFieldId;
    const current = fields[field];
    if (!current) continue;
    const simple = coerceToSimplePlan(current);
    fields[field] = {
      ...simple,
      locales: defaultLocalesForField(field, localization),
    };
  }
  return {
    ...resolution,
    defaults: {
      ...resolution.defaults,
      fields,
    },
  };
}

function localePreferenceEquals(
  left: LocalePreference,
  right: LocalePreference,
): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'locale' && right.type === 'locale') {
    return left.value === right.value;
  }
  return true;
}

/**
 * Fields UI only edits simple plans. Explicit attempt lists are collapsed into
 * provider + locale order (locale-first) so the chain remains editable.
 */
export function coerceToSimplePlan(
  plan: FieldResolutionPlan,
): FieldResolutionPlan {
  if (plan.strategy === 'locale-first' || plan.strategy === 'provider-first') {
    return plan;
  }

  const providers =
    plan.providers && plan.providers.length > 0
      ? [...plan.providers]
      : [
          ...new Set(
            (plan.steps ?? [])
              .map((step) => step.provider)
              .filter((provider) => provider.length > 0),
          ),
        ];

  const locales: LocalePreference[] = [];
  const sourceLocales =
    plan.locales && plan.locales.length > 0
      ? plan.locales
      : (plan.steps ?? [])
          .map((step) => step.locale)
          .filter((locale): locale is LocalePreference => locale != null);

  for (const locale of sourceLocales) {
    if (!locales.some((item) => localePreferenceEquals(item, locale))) {
      locales.push(locale);
    }
  }

  return {
    ...plan,
    strategy: 'locale-first',
    providers,
    locales: locales.length > 0 ? locales : [{ type: 'any-language' }],
    steps: undefined,
  };
}
