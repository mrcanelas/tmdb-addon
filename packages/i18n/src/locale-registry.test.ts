import { describe, expect, it } from 'vitest';
import {
  CANONICAL_LOCALE,
  getLocale,
  isStableLocale,
  negotiateInterfaceLocale,
  STABLE_LOCALES,
} from './index.js';

describe('@metalayer/i18n', () => {
  it('registers stable locales required for 1.0', () => {
    expect(STABLE_LOCALES).toEqual(['en-US', 'pt-BR', 'es-ES']);
    expect(CANONICAL_LOCALE).toBe('en-US');
    expect(getLocale('pt-BR')?.direction).toBe('ltr');
    expect(getLocale('ar-XB')?.direction).toBe('rtl');
  });

  it('negotiates interface locale with fallback to en-US', () => {
    expect(negotiateInterfaceLocale(['pt-BR'])).toBe('pt-BR');
    expect(negotiateInterfaceLocale([null, 'es'])).toBe('es-ES');
    expect(negotiateInterfaceLocale([undefined, 'zz-ZZ'])).toBe('en-US');
    expect(isStableLocale('en-US')).toBe(true);
    expect(isStableLocale('en-XA')).toBe(false);
  });
});
