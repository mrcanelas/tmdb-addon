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
import type { ProviderFetch } from '../artwork/types.js';
import {
  AI_SERVICE_PROFILES,
  OPENAI_COMPATIBLE_CHAT_PROFILES,
  type AiProviderId,
  type AiServiceProfile,
} from './ai-profiles.js';
import {
  searchTitlesWithOpenAiCompatible,
  type OpenAiCompatibleChatProfile,
  type OpenAiCompatibleMediaType,
} from './openai-compatible.js';

export interface AiAdapterOptions {
  apiKey?: string;
  fetchImpl?: ProviderFetch;
  policy?: Partial<ProviderHttpPolicy>;
  health?: ProviderHealthTracker;
}

/**
 * Shared runtime adapter for AI providers (ping + optional title search).
 */
export class AiProviderAdapter implements ProviderAdapter {
  readonly id: string;
  readonly locale: ProviderLocaleAdapter = unsupportedLocaleAdapter;
  readonly policy: ProviderHttpPolicy;
  readonly definition: ProviderDefinition;

  private readonly profile: AiServiceProfile;
  private readonly chatProfile?: OpenAiCompatibleChatProfile;
  private readonly defaultApiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly health: ProviderHealthTracker;

  constructor(providerId: AiProviderId, options: AiAdapterOptions = {}) {
    const profile = AI_SERVICE_PROFILES[providerId];
    const definition = getProvider(providerId);
    if (!definition) {
      throw new Error(`${providerId} is missing from PROVIDER_REGISTRY`);
    }

    this.id = providerId;
    this.definition = definition;
    this.profile = profile;
    this.chatProfile =
      providerId in OPENAI_COMPATIBLE_CHAT_PROFILES
        ? OPENAI_COMPATIBLE_CHAT_PROFILES[
            providerId as keyof typeof OPENAI_COMPATIBLE_CHAT_PROFILES
          ]
        : undefined;
    this.defaultApiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = { ...DEFAULT_PROVIDER_HTTP_POLICY, ...options.policy };
    this.health = options.health ?? new ProviderHealthTracker(this.policy);
  }

  getHealth(): ProviderHealthSnapshot {
    return this.health.snapshot();
  }

  async ping(ctx: ProviderContext): Promise<ProviderHealthSnapshot> {
    const apiKey = this.resolveApiKey(ctx);
    const probeUrl = this.profile.pingUrl(apiKey);

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
            ...this.profile.pingHeaders(apiKey),
            'X-Correlation-Id': ctx.correlationId,
          },
        });

        if (response.status === 401 || response.status === 403) {
          throw classifyHttpStatus(response.status, this.id);
        }
        if (!response.ok) {
          throw classifyHttpStatus(response.status, this.id);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (this.profile.validatePingBody && contentType.includes('application/json')) {
          const body = await response.json().catch(() => null);
          if (!this.profile.validatePingBody(body)) {
            throw classifyHttpStatus(401, this.id);
          }
        }

        return true;
      },
    });

    return this.getHealth();
  }

  async searchTitles(
    ctx: ProviderContext,
    query: string,
    mediaType: OpenAiCompatibleMediaType,
  ): Promise<string[]> {
    if (!this.chatProfile) {
      throw new ProviderError({
        code: 'unsupported',
        providerId: this.id,
        message: `${this.definition.name} title search is not implemented yet`,
        retryable: false,
      });
    }

    return searchTitlesWithOpenAiCompatible({
      profile: this.chatProfile,
      apiKey: this.resolveApiKey(ctx),
      query,
      mediaType,
      fetchImpl: this.fetchImpl,
      signal: ctx.signal,
    });
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
