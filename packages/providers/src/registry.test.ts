import { describe, expect, it } from 'vitest';
import { getProvider, listProviders, listProvidersByCategory } from './index.js';

describe('@metalayer/providers', () => {
  it('registers core planned providers with capability declarations', () => {
    const providers = listProviders();
    expect(providers.map((p) => p.id)).toEqual(
      expect.arrayContaining(['tmdb', 'tvdb', 'trakt', 'simkl', 'anilist', 'mal', 'kitsu', 'gemini']),
    );
    const tmdb = getProvider('tmdb');
    expect(tmdb?.capabilities.supportsLanguage).toBe(true);
    expect(tmdb?.capabilities.supportsOAuth).toBe(true);
    expect(tmdb?.connectionState).toBe('not_configured');
    expect(getProvider('anilist')?.connectionState).toBe('not_configured');
    expect(getProvider('kitsu')?.capabilities.mediaTypes).toContain('anime');
  });

  it('filters providers by category', () => {
    const tracking = listProvidersByCategory('tracking');
    expect(tracking.every((p) => p.categories.includes('tracking'))).toBe(true);
    expect(tracking.map((p) => p.id)).toEqual(
      expect.arrayContaining(['trakt', 'simkl', 'anilist', 'mal', 'kitsu']),
    );
  });
});
