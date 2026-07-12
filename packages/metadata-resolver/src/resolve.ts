import type {
  FieldProviders,
  LocalizationPreferences,
  ResolvableField,
} from '@metalayer/config';
import { DEFAULT_FIELD_PROVIDERS } from '@metalayer/config';
import {
  resolveField,
  type FieldContribution,
  type FieldResolution,
} from './field.js';

export type TitleMode = LocalizationPreferences['titleMode'];
export type DescriptionMode = LocalizationPreferences['descriptionMode'];

export interface ExternalIdsValue {
  tmdb?: number | string;
  imdb?: string;
  [key: string]: string | number | undefined;
}

/** Raw contributions keyed by resolvable field, then provider id. */
export type ProviderFieldBag = {
  title?: FieldContribution<string>[];
  originalTitle?: FieldContribution<string>[];
  description?: FieldContribution<string>[];
  poster?: FieldContribution<string>[];
  background?: FieldContribution<string>[];
  rating?: FieldContribution<number>[];
  voteCount?: FieldContribution<number>[];
  releaseDate?: FieldContribution<string>[];
  externalIds?: FieldContribution<ExternalIdsValue>[];
};

export interface ResolvedMetadata {
  title: FieldResolution<string>;
  originalTitle: FieldResolution<string>;
  description: FieldResolution<string>;
  poster: FieldResolution<string>;
  background: FieldResolution<string>;
  rating: FieldResolution<number>;
  voteCount: FieldResolution<number>;
  releaseDate: FieldResolution<string>;
  externalIds: FieldResolution<ExternalIdsValue>;
  /** Display title after titleMode (may combine localized + original). */
  displayTitle: string | null;
  displayDescription: string | null;
}

export interface MetaInspectorReport {
  identity: {
    publicId?: string;
    mediaType?: 'movie' | 'series' | 'anime';
    matches: ExternalIdsValue;
  };
  localization: {
    metadataLocale: string;
    metadataFallbackLocales: string[];
    titleMode: TitleMode;
    descriptionMode: DescriptionMode;
  };
  fields: ResolvedMetadata;
  fieldProviders: FieldProviders;
  timingMs: number;
}

function chainFor(
  fieldProviders: FieldProviders | undefined,
  field: ResolvableField,
): string[] {
  const fromConfig = fieldProviders?.[field];
  if (fromConfig && fromConfig.length > 0) return fromConfig;
  return DEFAULT_FIELD_PROVIDERS[field] ?? ['tmdb'];
}

export function formatTitle(input: {
  localized: string | null;
  original: string | null;
  mode: TitleMode;
}): string | null {
  const localized = input.localized?.trim() || null;
  const original = input.original?.trim() || null;

  switch (input.mode) {
    case 'original':
      return original ?? localized;
    case 'localized-with-original':
      if (localized && original && localized !== original) {
        return `${localized} (${original})`;
      }
      return localized ?? original;
    case 'original-with-localized':
      if (original && localized && localized !== original) {
        return `${original} (${localized})`;
      }
      return original ?? localized;
    case 'localized':
    default:
      return localized ?? original;
  }
}

export function formatDescription(input: {
  localized: string | null;
  original: string | null;
  mode: DescriptionMode;
}): string | null {
  const localized = input.localized?.trim() || null;
  const original = input.original?.trim() || null;

  switch (input.mode) {
    case 'original':
      return original ?? localized;
    case 'best-available':
      return localized ?? original;
    case 'localized':
    default:
      return localized ?? original;
  }
}

export interface ResolveMetadataOptions {
  fieldProviders?: FieldProviders;
  localization: Pick<
    LocalizationPreferences,
    | 'metadataLocale'
    | 'metadataFallbackLocales'
    | 'titleMode'
    | 'descriptionMode'
  >;
  now?: Date;
}

/**
 * Field-level resolution with provenance (AGENTS.md §10).
 * Contributions are provider-agnostic; adapters fill the bag upstream.
 */
export function resolveMetadata(
  bag: ProviderFieldBag,
  options: ResolveMetadataOptions,
): ResolvedMetadata {
  const localeOpts = {
    requestedLocale: options.localization.metadataLocale,
    fallbackLocales: options.localization.metadataFallbackLocales,
    now: options.now,
  };

  const title = resolveField(bag.title ?? [], chainFor(options.fieldProviders, 'title'), {
    ...localeOpts,
    policy: 'preferred-language',
  });
  const originalTitle = resolveField(
    bag.originalTitle ?? [],
    chainFor(options.fieldProviders, 'originalTitle'),
    { now: options.now },
  );
  const description = resolveField(
    bag.description ?? [],
    chainFor(options.fieldProviders, 'description'),
    {
      ...localeOpts,
      policy: 'preferred-language',
    },
  );
  const poster = resolveField(bag.poster ?? [], chainFor(options.fieldProviders, 'poster'), {
    now: options.now,
  });
  const background = resolveField(
    bag.background ?? [],
    chainFor(options.fieldProviders, 'background'),
    { now: options.now },
  );
  const rating = resolveField(bag.rating ?? [], chainFor(options.fieldProviders, 'rating'), {
    policy: 'highest-confidence',
    now: options.now,
  });
  const voteCount = resolveField(
    bag.voteCount ?? [],
    chainFor(options.fieldProviders, 'voteCount'),
    { now: options.now },
  );
  const releaseDate = resolveField(
    bag.releaseDate ?? [],
    chainFor(options.fieldProviders, 'releaseDate'),
    { now: options.now },
  );
  const externalIds = resolveField(
    bag.externalIds ?? [],
    chainFor(options.fieldProviders, 'externalIds'),
    { now: options.now },
  );

  return {
    title,
    originalTitle,
    description,
    poster,
    background,
    rating,
    voteCount,
    releaseDate,
    externalIds,
    displayTitle: formatTitle({
      localized: title.value,
      original: originalTitle.value,
      mode: options.localization.titleMode,
    }),
    displayDescription: formatDescription({
      localized: description.value,
      original: null,
      mode: options.localization.descriptionMode,
    }),
  };
}

export function buildInspectorReport(input: {
  bag: ProviderFieldBag;
  fieldProviders?: FieldProviders;
  localization: ResolveMetadataOptions['localization'];
  identity?: {
    publicId?: string;
    mediaType?: 'movie' | 'series' | 'anime';
  };
  timingMs?: number;
  now?: Date;
}): MetaInspectorReport {
  const fields = resolveMetadata(input.bag, {
    fieldProviders: input.fieldProviders,
    localization: input.localization,
    now: input.now,
  });

  return {
    identity: {
      publicId: input.identity?.publicId,
      mediaType: input.identity?.mediaType,
      matches: fields.externalIds.value ?? {},
    },
    localization: {
      metadataLocale: input.localization.metadataLocale,
      metadataFallbackLocales: input.localization.metadataFallbackLocales,
      titleMode: input.localization.titleMode,
      descriptionMode: input.localization.descriptionMode,
    },
    fields,
    fieldProviders: input.fieldProviders ?? { ...DEFAULT_FIELD_PROVIDERS },
    timingMs: input.timingMs ?? 0,
  };
}
