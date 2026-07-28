import type {
  FieldProviders,
  LocalizationPreferences,
  ResolvableField,
  ResolutionConfig,
} from '@metalayer/config';
import { DEFAULT_FIELD_PROVIDERS, parseResolutionConfig } from '@metalayer/config';
import {
  resolveField,
  type FieldContribution,
  type FieldResolution,
} from './field.js';
import { compileResolutionPlan } from './compile.js';
import { resolveFieldFromPlan } from './resolve-plan.js';

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
  logo?: FieldContribution<string>[];
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
  logo: FieldResolution<string>;
  rating: FieldResolution<number>;
  voteCount: FieldResolution<number>;
  releaseDate: FieldResolution<string>;
  externalIds: FieldResolution<ExternalIdsValue>;
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

function resolveOne<T>(
  field: ResolvableField,
  contributions: FieldContribution<T>[],
  options: ResolveMetadataOptions,
): FieldResolution<T> {
  if (options.useFieldResolutionChains === false) {
    const policy =
      field === 'title' || field === 'description'
        ? 'preferred-language'
        : field === 'rating'
          ? 'highest-confidence'
          : 'first-valid';
    return resolveField(contributions, chainFor(options.fieldProviders, field), {
      policy,
      requestedLocale: options.localization.metadataLocale,
      fallbackLocales: options.localization.metadataFallbackLocales,
      now: options.now,
    });
  }

  let resolution: ResolutionConfig | undefined;
  if (options.resolution) {
    try {
      resolution = parseResolutionConfig(options.resolution);
    } catch {
      resolution = undefined;
    }
  }

  const plan = compileResolutionPlan({
    field,
    mediaType: options.mediaType,
    resolution,
    fieldProviders: options.fieldProviders,
    metadataLocale: options.localization.metadataLocale,
    fallbackLocales: options.localization.metadataFallbackLocales,
  });

  const result = resolveFieldFromPlan(contributions, plan, {
    originalLanguage: options.originalLanguage,
    now: options.now,
  });

  return {
    ...result,
    requestedLocale: options.localization.metadataLocale,
  };
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
  resolution?: unknown;
  mediaType?: 'movie' | 'series' | 'anime';
  originalLanguage?: string;
  /** Default true — walk compiled plans and emit attempts. */
  useFieldResolutionChains?: boolean;
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
 * Field-level resolution with provenance and Field Resolution Chains (AGENTS.md §10).
 */
export function resolveMetadata(
  bag: ProviderFieldBag,
  options: ResolveMetadataOptions,
): ResolvedMetadata {
  const title = resolveOne('title', bag.title ?? [], options);
  const originalTitle = resolveOne('originalTitle', bag.originalTitle ?? [], options);
  const description = resolveOne('description', bag.description ?? [], options);
  const poster = resolveOne('poster', bag.poster ?? [], options);
  const background = resolveOne('background', bag.background ?? [], options);
  const logo = resolveOne('logo', bag.logo ?? [], options);
  const rating = resolveOne('rating', bag.rating ?? [], options);
  const voteCount = resolveOne('voteCount', bag.voteCount ?? [], options);
  const releaseDate = resolveOne('releaseDate', bag.releaseDate ?? [], options);
  const externalIds = resolveOne('externalIds', bag.externalIds ?? [], options);

  return {
    title,
    originalTitle,
    description,
    poster,
    background,
    logo,
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
  resolution?: unknown;
  mediaType?: 'movie' | 'series' | 'anime';
  originalLanguage?: string;
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
    resolution: input.resolution,
    mediaType: input.mediaType ?? input.identity?.mediaType,
    originalLanguage: input.originalLanguage,
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
