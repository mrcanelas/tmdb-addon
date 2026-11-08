import type { FastifyInstance } from 'fastify';
import {
  createProviderAdapter,
  type CreateProviderAdapterOptions,
  type ProviderAdapter,
} from '@metalayer/providers';

/**
 * Creates a provider adapter wired to the process-scoped health registry
 * so circuit breakers accumulate across requests (AGENTS.md §29).
 */
export function createAppProviderAdapter(
  app: Pick<FastifyInstance, 'providerFetch' | 'providerHealth'>,
  providerId: string,
  options: CreateProviderAdapterOptions = {},
): ProviderAdapter | null {
  return createProviderAdapter(providerId, {
    ...options,
    policy: {
      ...app.providerHealth.getDefaultPolicy(),
      ...options.policy,
    },
    fetchImpl: options.fetchImpl ?? app.providerFetch,
    healthRegistry: options.healthRegistry ?? app.providerHealth,
  });
}
