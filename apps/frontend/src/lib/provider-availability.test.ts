import { describe, expect, it } from 'vitest';
import type { PublicSource } from './api.js';
import {
  availabilityOf,
  buildProviderAvailability,
  capabilityFieldFor,
  filterAvailableProviders,
  providerAvailabilityFor,
} from './provider-availability.js';

function source(overrides: Partial<PublicSource> & { id: string }): PublicSource {
  return {
    name: overrides.id.toUpperCase(),
    categories: ['metadata'],
    connectionState: 'not_configured',
    requiresCredential: false,
    requiresOAuth: false,
    adapterAvailable: true,
    capabilities: {
      mediaTypes: ['movie', 'series'],
      metadataFields: ['title', 'description', 'poster'],
      catalogFeatures: [],
      supportsSearch: false,
      supportsPagination: false,
      supportsRegion: false,
      supportsLanguage: false,
      supportsAgeRating: false,
      supportsDigitalRelease: false,
      supportsTracking: false,
      supportsOAuth: false,
    },
    ...overrides,
  };
}

describe('provider availability', () => {
  it('rejects coming_soon scaffolds and adapterless providers', () => {
    expect(
      providerAvailabilityFor(source({ id: 'tvdb', connectionState: 'coming_soon' })),
    ).toEqual({ id: 'tvdb', available: false, reason: 'comingSoon' });

    expect(
      providerAvailabilityFor(source({ id: 'imdb', adapterAvailable: false })),
    ).toEqual({ id: 'imdb', available: false, reason: 'noAdapter' });
  });

  it('rejects providers that do not declare the requested field', () => {
    const fanart = source({
      id: 'fanart',
      capabilities: {
        ...source({ id: 'fanart' }).capabilities,
        metadataFields: ['poster', 'background', 'logo'],
      },
    });

    expect(providerAvailabilityFor(fanart, 'poster').available).toBe(true);
    expect(providerAvailabilityFor(fanart, 'title')).toEqual({
      id: 'fanart',
      available: false,
      reason: 'unsupportedField',
    });
  });

  it('does not filter fields the capability model cannot express', () => {
    expect(capabilityFieldFor('runtime')).toBeNull();
    expect(capabilityFieldFor('certification')).toBeNull();
    expect(capabilityFieldFor('title')).toBe('title');
    // originalTitle and voteCount reuse the closest declared capability.
    expect(capabilityFieldFor('originalTitle')).toBe('title');
    expect(capabilityFieldFor('voteCount')).toBe('rating');

    expect(providerAvailabilityFor(source({ id: 'tmdb' }), 'runtime').available).toBe(
      true,
    );
  });

  it('treats unknown providers as unavailable but keeps chains intact without data', () => {
    const map = buildProviderAvailability([source({ id: 'tmdb' })], 'title');

    expect(availabilityOf(map, 'tmdb').available).toBe(true);
    expect(availabilityOf(map, 'ghost')).toEqual({
      id: 'ghost',
      available: false,
      reason: 'unknownProvider',
    });
    // No availability data yet (still loading) must not hide providers.
    expect(availabilityOf(undefined, 'ghost').available).toBe(true);
  });

  it('filters provider lists only when availability is known', () => {
    const map = buildProviderAvailability(
      [source({ id: 'tmdb' }), source({ id: 'tvdb', connectionState: 'coming_soon' })],
      'title',
    );

    expect(filterAvailableProviders(['tmdb', 'tvdb'], map)).toEqual(['tmdb']);
    expect(filterAvailableProviders(['tmdb', 'tvdb'], undefined)).toEqual([
      'tmdb',
      'tvdb',
    ]);
  });
});
