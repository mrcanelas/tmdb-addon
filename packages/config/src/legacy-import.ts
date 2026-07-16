import { decompressFromEncodedURIComponent } from './lz-string.js';
import { createDefaultMetaLayerConfig, type CatalogDefinition, type MetaLayerConfig } from './schema.js';
import {
  listLegacySecretsPresent,
  parseLegacyAddonConfig,
  type LegacyAddonConfig,
} from './legacy.js';

export interface LegacyImportAttentionItem {
  code: string;
  message: string;
  field?: string;
  /** Stable interpolation params for client i18n (never secrets). */
  params?: Record<string, string>;
}

export interface LegacyImportReport {
  imported: string[];
  needsAttention: LegacyImportAttentionItem[];
  /** Provider ids that will be written to Secret Vault (never values). */
  secretsToVault: string[];
}

export interface LegacyImportPlan {
  report: LegacyImportReport;
  config: MetaLayerConfig;
  /** Plaintext secrets for vault write only — do not log or return to clients. */
  secrets: Record<string, string>;
}

const SECRET_TO_PROVIDER: Record<string, string> = {
  tmdbApiKey: 'tmdb',
  sessionId: 'tmdb_session',
  rpdbkey: 'rpdb',
  topposterskey: 'topposters',
  mdblistkey: 'mdblist',
  publicmetadbkey: 'publicmetadb',
  geminikey: 'gemini',
  groqkey: 'groq',
  openrouterkey: 'openrouter',
  traktAccessToken: 'trakt',
  traktRefreshToken: 'trakt_refresh',
};

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function localeToRegion(locale: string): string | undefined {
  const parts = locale.split('-');
  if (parts.length >= 2 && parts[1] && /^[A-Za-z]{2}$/.test(parts[1])) {
    return parts[1].toUpperCase();
  }
  return undefined;
}

function splitCatalogId(catalogId: string): { provider: string; providerCatalogId: string } {
  const dot = catalogId.indexOf('.');
  if (dot === -1) {
    return { provider: 'unknown', providerCatalogId: catalogId };
  }
  return {
    provider: catalogId.slice(0, dot),
    providerCatalogId: catalogId.slice(dot + 1),
  };
}

function mediaTypeFromLegacy(type: string): 'movie' | 'series' | 'anime' {
  if (type === 'series' || type === 'anime' || type === 'movie') return type;
  return 'movie';
}

/**
 * Accepts raw JSON, a legacy object, lz-string URL segment, or language-only string.
 */
export function parseLegacyImportSource(input: unknown): LegacyAddonConfig {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('LEGACY_IMPORT_EMPTY');
    }
    try {
      const decoded = decompressFromEncodedURIComponent(trimmed);
      if (decoded) {
        return parseLegacyAddonConfig(JSON.parse(decoded));
      }
    } catch {
      // fall through
    }
    try {
      return parseLegacyAddonConfig(JSON.parse(trimmed));
    } catch {
      // language-only legacy path
      return parseLegacyAddonConfig({ language: trimmed });
    }
  }
  return parseLegacyAddonConfig(input);
}

export function planLegacyImport(
  source: unknown,
  options: { name?: string } = {},
): LegacyImportPlan {
  const legacy = parseLegacyImportSource(source);
  const imported: string[] = [];
  const needsAttention: LegacyImportAttentionItem[] = [];
  const now = new Date().toISOString();

  const locale = legacy.language || 'en-US';
  const region = localeToRegion(locale);
  if (!region) {
    needsAttention.push({
      code: 'REGION_INFERRED',
      message: 'Content region could not be derived from language; defaulting to US.',
      field: 'language',
    });
  } else {
    imported.push('language');
    imported.push('region');
  }

  const catalogs: CatalogDefinition[] = (legacy.catalogs ?? []).map((catalog, index) => {
    const { provider, providerCatalogId } = splitCatalogId(catalog.id);
    if (provider === 'unknown') {
      needsAttention.push({
        code: 'CATALOG_PROVIDER_UNKNOWN',
        message: `Catalog id "${catalog.id}" has no provider prefix.`,
        field: 'catalogs',
        params: { catalogId: catalog.id },
      });
    }
    return {
      instanceId: `legacy_${index}_${catalog.id.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
      provider,
      providerCatalogId,
      mediaType: mediaTypeFromLegacy(catalog.type),
      originalName: catalog.name || catalog.id,
      customName: catalog.name,
      enabled: catalog.enabled !== false,
      showInHome: catalog.showInHome !== false,
      position: index,
      tags: ['imported-from-tmdb-addon'],
    };
  });
  if (catalogs.length > 0) imported.push('catalogs');

  const featureFlags: Record<string, boolean> = {};
  const flagMap: Array<[keyof LegacyAddonConfig, string]> = [
    ['includeAdult', 'includeAdult'],
    ['provideImdbId', 'provideImdbId'],
    ['returnImdbId', 'returnImdbId'],
    ['tmdbPrefix', 'tmdbPrefix'],
    ['hideEpisodeThumbnails', 'hideEpisodeThumbnails'],
    ['searchEnabled', 'searchEnabled'],
    ['hideInCinemaTag', 'hideInCinemaTag'],
    ['enableAgeRating', 'enableAgeRating'],
    ['showAgeRatingInGenres', 'showAgeRatingInGenres'],
    ['showAgeRatingWithImdbRating', 'showAgeRatingWithImdbRating'],
    ['strictRegionFilter', 'strictRegionFilter'],
  ];
  for (const [legacyKey, flagKey] of flagMap) {
    const parsed = asBoolean(legacy[legacyKey]);
    if (parsed !== undefined) {
      featureFlags[flagKey] = parsed;
      imported.push(flagKey);
    }
  }

  // ADR 0006: MetaLayer defaults to IMDb public ids; honor explicit legacy false.
  const returnImdbId = asBoolean(legacy.returnImdbId);
  const stremioPublicId = returnImdbId === false ? 'tmdb' : 'imdb';
  imported.push('identity.stremioPublicId');

  if (legacy.searchEnabled !== undefined) imported.push('search');
  if (legacy.ageRating) imported.push('ageRating');

  const secrets: Record<string, string> = {};
  for (const key of listLegacySecretsPresent(legacy)) {
    const value = legacy[key];
    if (typeof value !== 'string' || !value) continue;
    const provider = SECRET_TO_PROVIDER[key];
    if (!provider) continue;
    secrets[provider] = value;
  }
  const secretsToVault = Object.keys(secrets);
  if (secretsToVault.length > 0) imported.push('secrets');

  if (secrets.trakt && !secrets.trakt_refresh) {
    needsAttention.push({
      code: 'TRAKT_REFRESH_MISSING',
      message: 'Trakt access token imported without refresh token; reconnection may be required.',
      field: 'traktAccessToken',
    });
  }
  if (secrets.tmdb_session && !secrets.tmdb) {
    needsAttention.push({
      code: 'TMDB_SESSION_WITHOUT_API_KEY',
      message: 'TMDB session imported without API key; account features may need re-auth.',
      field: 'sessionId',
    });
  }

  const castCount = asNumber(legacy.castCount);
  if (castCount !== undefined) imported.push('castCount');

  const config = createDefaultMetaLayerConfig({
    name: options.name || 'Imported from TMDB Addon',
    localization: {
      interfaceLocale: locale,
      metadataLocale: locale,
      metadataFallbackLocales: locale === 'en-US' ? [] : ['en-US'],
      titleMode: 'localized',
      descriptionMode: 'localized',
      contentRegion: region || 'US',
      availabilityRegion: region,
      certificationRegion: region,
      releaseRegion: region,
      timezone: 'UTC',
    },
    identity: {
      stremioPublicId,
    },
    catalogs,
    featureFlags,
    legacyImport: {
      source: 'tmdb-addon',
      importedAt: now,
      ageRating: legacy.ageRating,
      castCount,
    },
  });

  return {
    report: {
      imported: [...new Set(imported)],
      needsAttention,
      secretsToVault,
    },
    config,
    secrets,
  };
}

/** Redacted view of an import plan safe for API responses and logs. */
export function toPublicImportPlan(plan: LegacyImportPlan) {
  return {
    report: plan.report,
    config: plan.config,
    // never include secrets plaintext
  };
}
