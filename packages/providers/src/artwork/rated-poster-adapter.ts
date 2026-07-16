import { classifyHttpStatus, ProviderError } from '../core/errors.js';
import {
  DEFAULT_PROVIDER_HTTP_POLICY,
  ProviderHealthTracker,
  withRetry,
  type ProviderAdapter,
  type ProviderContext,
  type ProviderHealthSnapshot,
  type ProviderHttpPolicy,
} from '../core/runtime.js';
import { unsupportedLocaleAdapter } from '../locale/adapters.js';
import type { ProviderLocaleAdapter } from '../locale/types.js';
import { getProvider } from '../registry.js';
import type { ProviderDefinition } from '../types.js';
import {
  buildRatedPosterUrl,
  type RatedPosterMediaType,
  type RatedPosterServiceProfile,
} from './rated-poster.js';
import type { ArtworkAsset, ArtworkBundle, ArtworkKind, ProviderFetch } from './types.js';

export interface RatedPosterAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
  /** Optional query defaults (e.g. Top Posters `style=modern`). */
  defaultExtraParams?: Record<string, string | undefined>;
}

/**
 * Shared artwork adapter for RPDB-compatible rated-poster hosts and cousins.
 */
export class RatedPosterArtworkAdapter implements ProviderAdapter {
  readonly id: string;
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly profile: RatedPosterServiceProfile;
  private readonly defaultApiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;
  private readonly defaultExtraParams?: Record<string, string | undefined>;

  constructor(
    profile: RatedPosterServiceProfile,
    options: RatedPosterAdapterOptions = {},
  ) {
    const definition = getProvider(profile.id);
    if (!definition) {
      throw new Error(`${profile.id} is missing from PROVIDER_REGISTRY`);
    }
    this.id = profile.id;
    this.definition = definition;
    this.profile = {
      ...profile,
      baseUrl: (options.baseUrl ?? profile.baseUrl).replace(/\/$/, ''),
    };
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
    this.defaultExtraParams = options.defaultExtraParams;
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  buildPosterUrl(options: {
    apiKey: string;
    mediaType: RatedPosterMediaType;
    tmdbId: number | string;
    kind?: ArtworkKind;
    language?: string;
    extraParams?: Record<string, string | undefined>;
  }): string {
    return buildRatedPosterUrl({
      profile: this.profile,
      apiKey: options.apiKey,
      mediaType: options.mediaType,
      tmdbId: options.tmdbId,
      kind: options.kind ?? 'poster',
      language: options.language,
      extraParams: {
        ...this.defaultExtraParams,
        ...options.extraParams,
      },
    });
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    const apiKey = this.resolveApiKey(ctx);
    const probeUrl = this.profile.verifyPath
      ? `${this.profile.baseUrl}${this.profile.verifyPath(apiKey)}`
      : this.buildPosterUrl({
          apiKey,
          mediaType: 'movie',
          tmdbId: 550,
          kind: 'poster',
        });

    await withRetry({
      providerId: this.id,
      policy: this.policy,
      health: this.health,
      signal: ctx.signal,
      execute: async (signal) => {
        const response = await this.fetchImpl(probeUrl, {
          method: 'GET',
          signal,
          headers: {
            'X-Correlation-Id': ctx.correlationId,
          },
        });
        if (response.status === 401 || response.status === 403) {
          throw classifyHttpStatus(response.status, this.id);
        }
        // Top Posters verify may return JSON; poster probes may 404 empty art.
        if (!response.ok && response.status !== 404) {
          throw classifyHttpStatus(response.status, this.id);
        }
        if (this.profile.verifyPath && response.ok) {
          // Prefer explicit invalid payload when hosts return 200 + { valid:false }.
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const body = (await response.clone().json().catch(() => null)) as {
              valid?: boolean;
              success?: boolean;
            } | null;
            if (body && (body.valid === false || body.success === false)) {
              throw classifyHttpStatus(401, this.id);
            }
          }
        }
        return true;
      },
    });

    return this.getHealth();
  }

  getMovieArtwork(
    ctx: ProviderContext,
    tmdbId: number,
    kinds: ArtworkKind[] = ['poster'],
  ): ArtworkBundle {
    return this.buildArtworkBundle(ctx, 'movie', tmdbId, kinds);
  }

  getSeriesArtwork(
    ctx: ProviderContext,
    tmdbId: number,
    kinds: ArtworkKind[] = ['poster'],
  ): ArtworkBundle {
    return this.buildArtworkBundle(ctx, 'series', tmdbId, kinds);
  }

  private buildArtworkBundle(
    ctx: ProviderContext,
    mediaType: RatedPosterMediaType,
    tmdbId: number,
    kinds: ArtworkKind[],
  ): ArtworkBundle {
    const apiKey = this.resolveApiKey(ctx);
    const assets: ArtworkAsset[] = kinds.map((kind) => ({
      kind,
      url: this.buildPosterUrl({
        apiKey,
        mediaType,
        tmdbId,
        kind,
        language: ctx.locale,
      }),
      provider: this.id,
    }));

    return {
      providerId: this.id,
      identity: `tmdb:${mediaType}:${tmdbId}`,
      assets,
    };
  }

  private resolveApiKey(ctx: ProviderContext): string {
    const apiKey = ctx.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      throw new ProviderError({
        code: 'auth',
        providerId: this.id,
        message: `${this.definition.name} API key is missing`,
        retryable: false,
      });
    }
    return apiKey;
  }
}
