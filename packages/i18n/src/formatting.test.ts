import { describe, expect, it } from 'vitest';
import {
  formatCodedDisplayName,
  formatLanguageDisplayName,
  formatRegionDisplayName,
  formatTimezoneDisplayName,
} from './formatting.js';

describe('@metalayer/i18n formatting', () => {
  it('formats language and region names for the display locale', () => {
    expect(formatLanguageDisplayName('pt-BR', 'en-US').toLowerCase()).toContain(
      'portuguese',
    );
    expect(formatRegionDisplayName('BR', 'en-US').toLowerCase()).toContain(
      'brazil',
    );
    expect(formatCodedDisplayName('Brazil', 'BR')).toBe('Brazil (BR)');
    expect(formatCodedDisplayName('BR', 'BR')).toBe('BR');
  });

  it('falls back to the raw code for invalid or unknown values', () => {
    expect(formatRegionDisplayName('XX', 'en-US')).toBe('XX');
    expect(formatRegionDisplayName('invalid', 'en-US')).toBe('invalid');
    expect(formatLanguageDisplayName('zz-ZZ', 'en-US')).toBe('zz-ZZ');
  });

  it('formats time zone names when supported', () => {
    const label = formatTimezoneDisplayName('America/Sao_Paulo', 'en-US');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});
