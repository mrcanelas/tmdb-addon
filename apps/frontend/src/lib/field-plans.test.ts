import { describe, expect, it } from 'vitest';
import type { ResolutionConfig } from '@metalayer/config';
import {
  ensureFieldPlan,
  isArtworkField,
  isLocalizedField,
  resetFieldPlan,
} from './field-plans.js';

const emptyResolution: ResolutionConfig = {
  version: 1,
  defaults: { fields: {} },
  mediaTypes: {},
};

describe('field resolution defaults', () => {
  it('classifies artwork and localized fields', () => {
    expect(isArtworkField('logo')).toBe(true);
    expect(isArtworkField('rating')).toBe(false);
    expect(isLocalizedField('title')).toBe(true);
    expect(isLocalizedField('voteCount')).toBe(false);
  });

  it('defaults artwork chains with no-language after the primary locale', () => {
    const background = ensureFieldPlan(emptyResolution, 'background', {
      metadataLocale: 'pt-BR',
      metadataFallbackLocales: ['en-US'],
    });
    expect(background.strategy).toBe('locale-first');
    expect(background.providers?.[0]).toBe('fanart');
    expect(background.locales?.[0]).toEqual({ type: 'locale', value: 'pt-BR' });
    expect(background.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );

    const logo = ensureFieldPlan(emptyResolution, 'logo', {
      metadataLocale: 'en-US',
      metadataFallbackLocales: [],
    });
    expect(logo.providers).toContain('rpdb');
    expect(logo.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );
  });

  it('seeds localized title chains from localization preferences', () => {
    const title = ensureFieldPlan(emptyResolution, 'title', {
      metadataLocale: 'es-ES',
      metadataFallbackLocales: ['en-US'],
    });
    expect(title.locales).toEqual([
      { type: 'locale', value: 'es-ES' },
      { type: 'locale', value: 'en-US' },
      { type: 'original-language' },
    ]);
  });

  it('defaults factual fields to provider-first without language lists', () => {
    const rating = ensureFieldPlan(emptyResolution, 'rating');
    expect(rating.strategy).toBe('provider-first');
    expect(rating.providers?.[0]).toBe('imdb');
  });

  it('coerces explicit plans to simple when loading for edit', () => {
    const dirty: ResolutionConfig = {
      version: 1,
      defaults: {
        fields: {
          title: {
            version: 1,
            strategy: 'explicit',
            steps: [
              {
                id: 's1',
                provider: 'tmdb',
                locale: { type: 'locale', value: 'pt-BR' },
                enabled: true,
              },
              {
                id: 's2',
                provider: 'imdb',
                locale: { type: 'original-language' },
                enabled: true,
              },
            ],
            skipEmpty: true,
            skipInvalid: true,
            stopAfterFirstValid: true,
          },
        },
      },
      mediaTypes: {},
    };
    const plan = ensureFieldPlan(dirty, 'title');
    expect(plan.strategy).toBe('locale-first');
    expect(plan.providers).toEqual(['tmdb', 'imdb']);
    expect(plan.locales).toEqual([
      { type: 'locale', value: 'pt-BR' },
      { type: 'original-language' },
    ]);
    expect(resetFieldPlan('title').strategy).toBe('locale-first');
  });
});
