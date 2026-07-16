import { describe, expect, it } from 'vitest';
import type { ResolutionConfig } from '@metalayer/config';
import {
  APPEARANCE_EDIT_FIELDS,
  ensureAppearancePlan,
  isArtworkField,
} from './appearance-plans.js';

const emptyResolution: ResolutionConfig = {
  version: 1,
  defaults: { fields: {} },
  mediaTypes: {},
};

describe('appearance field resolution defaults', () => {
  it('includes background and logo among editable artwork fields', () => {
    expect(APPEARANCE_EDIT_FIELDS).toContain('background');
    expect(APPEARANCE_EDIT_FIELDS).toContain('logo');
    expect(isArtworkField('background')).toBe(true);
    expect(isArtworkField('logo')).toBe(true);
    expect(isArtworkField('title')).toBe(false);
  });

  it('defaults artwork chains with no-language after the primary locale', () => {
    const background = ensureAppearancePlan(emptyResolution, 'background');
    expect(background.strategy).toBe('locale-first');
    expect(background.providers?.[0]).toBe('fanart');
    expect(background.locales).toEqual(
      expect.arrayContaining([
        { type: 'locale', value: 'pt-BR' },
        { type: 'no-language' },
        { type: 'locale', value: 'en-US' },
      ]),
    );

    const poster = ensureAppearancePlan(emptyResolution, 'poster');
    expect(poster.providers?.[0]).toBe('rpdb');
    expect(poster.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );

    const logo = ensureAppearancePlan(emptyResolution, 'logo');
    expect(logo.providers).toEqual([
      'rpdb',
      'topposters',
      'aioratings',
      'openposterdb',
      'fanart',
      'tmdb',
      'tvdb',
    ]);
    expect(logo.locales?.some((locale) => locale.type === 'no-language')).toBe(
      true,
    );
  });
});
