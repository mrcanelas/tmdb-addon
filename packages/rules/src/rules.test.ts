import { describe, expect, it } from 'vitest';
import { evaluateRules } from './evaluate.js';
import { mergeRuleSets, resolveEffectiveRules } from './inheritance.js';
import { checkProviderRuleSupport } from './provider-limitations.js';
import type { ProviderCapabilities } from '@metalayer/providers';

const caps = (partial: Partial<ProviderCapabilities> = {}): ProviderCapabilities => ({
  mediaTypes: ['movie'],
  metadataFields: ['title'],
  catalogFeatures: ['popular'],
  supportsSearch: true,
  supportsPagination: true,
  supportsRegion: true,
  supportsLanguage: true,
  supportsAgeRating: true,
  supportsDigitalRelease: false,
  supportsTracking: false,
  supportsOAuth: false,
  ...partial,
});

describe('@metalayer/rules', () => {
  it('excludes items below rating and explains the reason', () => {
    const result = evaluateRules(
      { id: '1', rating: 5.5, genres: ['Drama'] },
      { minimumRating: 7 },
    );
    expect(result.include).toBe(false);
    expect(result.reasons[0]?.rule).toBe('minimumRating');
  });

  it('merges inheritance with later layers overriding earlier keys', () => {
    const effective = resolveEffectiveRules({
      global: { excludeAdult: true, minimumRating: 6 },
      catalog: { minimumRating: 8, includeGenres: ['Sci-Fi'] },
      context: 'home',
      contextRules: { yearFrom: 2020 },
    });
    expect(effective).toEqual({
      excludeAdult: true,
      minimumRating: 8,
      includeGenres: ['Sci-Fi'],
      yearFrom: 2020,
    });
  });

  it('reports unsupported provider rules with structured warnings', () => {
    const warnings = checkProviderRuleSupport(
      { digitallyReleasedOnly: true, hideWatched: true },
      'tmdb',
      caps(),
    );
    expect(warnings.map((item) => item.rule).sort()).toEqual([
      'digitallyReleasedOnly',
      'hideWatched',
    ]);
  });

  it('keeps prefer genres as annotations without excluding', () => {
    const result = evaluateRules(
      { id: '2', genres: ['Action'], rating: 8 },
      { preferGenres: ['Action'], minimumRating: 7 },
    );
    expect(result.include).toBe(true);
    expect(result.reasons.some((item) => item.outcome === 'prefer')).toBe(true);
  });

  it('sorts merge layers by declared inheritance order', () => {
    const merged = mergeRuleSets([
      { context: 'catalog', rules: { yearTo: 2024 } },
      { context: 'global', rules: { yearTo: 2020, excludeAdult: true } },
    ]);
    expect(merged.yearTo).toBe(2024);
    expect(merged.excludeAdult).toBe(true);
  });
});
