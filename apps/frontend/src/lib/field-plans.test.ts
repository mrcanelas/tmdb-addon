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
    const background = ensureFieldPlan(emptyResolution, 'background');
    expect(background.strategy).toBe('locale-first');
    expect(background.providers?.[0]).toBe('fanart');
    expect(background.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );

    const logo = ensureFieldPlan(emptyResolution, 'logo');
    expect(logo.providers).toContain('rpdb');
    expect(logo.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );
  });

  it('defaults factual fields to provider-first without language lists', () => {
    const rating = ensureFieldPlan(emptyResolution, 'rating');
    expect(rating.strategy).toBe('provider-first');
    expect(rating.providers?.[0]).toBe('imdb');
  });

  it('resets a field to the category default', () => {
    const dirty: ResolutionConfig = {
      version: 1,
      defaults: {
        fields: {
          title: {
            version: 1,
            strategy: 'explicit',
            steps: [{ id: 's1', provider: 'imdb', enabled: true }],
            skipEmpty: true,
            skipInvalid: true,
            stopAfterFirstValid: true,
          },
        },
      },
      mediaTypes: {},
    };
    expect(ensureFieldPlan(dirty, 'title').strategy).toBe('explicit');
    expect(resetFieldPlan('title').strategy).toBe('locale-first');
  });
});
