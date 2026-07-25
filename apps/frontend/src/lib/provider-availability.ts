import type { PublicSource } from '@/lib/api';
import type { FieldRailId } from './field-registry.js';

/**
 * Why a provider cannot be offered for a field (AGENTS.md §8.1.1).
 * Reasons are surfaced instead of silently dropping providers (§4.3).
 */
export type ProviderUnavailableReason =
  | 'comingSoon'
  | 'noAdapter'
  | 'unsupportedField'
  | 'unknownProvider';

export interface ProviderAvailability {
  id: string;
  available: boolean;
  reason?: ProviderUnavailableReason;
}

/**
 * Fields rail id → provider capability field.
 * Fields the capability model cannot express (runtime, certification, credits
 * beyond cast, release dates) map to null so we never hide a provider for a
 * constraint the registry does not actually declare.
 */
const CAPABILITY_FIELD: Partial<Record<FieldRailId, string>> = {
  title: 'title',
  originalTitle: 'title',
  description: 'description',
  tagline: 'description',
  poster: 'poster',
  background: 'background',
  logo: 'logo',
  rating: 'rating',
  voteCount: 'rating',
  genres: 'genres',
  cast: 'cast',
  episodes: 'episodes',
  episodeOrder: 'episodes',
  externalIds: 'externalIds',
};

export function capabilityFieldFor(field: string): string | null {
  return CAPABILITY_FIELD[field as FieldRailId] ?? null;
}

/**
 * Instance availability for one provider, optionally scoped to a field.
 * Mirrors the Sources convention: a provider is usable when it has a runnable
 * adapter and is not a `coming_soon` scaffold entry.
 */
export function providerAvailabilityFor(
  source: PublicSource,
  field?: string,
): ProviderAvailability {
  if (source.connectionState === 'coming_soon') {
    return { id: source.id, available: false, reason: 'comingSoon' };
  }
  if (!source.adapterAvailable) {
    return { id: source.id, available: false, reason: 'noAdapter' };
  }

  const capability = field ? capabilityFieldFor(field) : null;
  if (capability && !source.capabilities.metadataFields.includes(capability)) {
    return { id: source.id, available: false, reason: 'unsupportedField' };
  }

  return { id: source.id, available: true };
}

export function buildProviderAvailability(
  sources: PublicSource[],
  field?: string,
): Record<string, ProviderAvailability> {
  const map: Record<string, ProviderAvailability> = {};
  for (const source of sources) {
    map[source.id] = providerAvailabilityFor(source, field);
  }
  return map;
}

/** Providers absent from `GET /api/v1/sources` are treated as unavailable. */
export function availabilityOf(
  map: Record<string, ProviderAvailability> | undefined,
  providerId: string,
): ProviderAvailability {
  if (!map) return { id: providerId, available: true };
  return (
    map[providerId] ?? {
      id: providerId,
      available: false,
      reason: 'unknownProvider',
    }
  );
}

export function filterAvailableProviders(
  providerIds: string[],
  map: Record<string, ProviderAvailability> | undefined,
): string[] {
  if (!map) return providerIds;
  return providerIds.filter((id) => availabilityOf(map, id).available);
}
