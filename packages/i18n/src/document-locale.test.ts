import { describe, expect, it } from 'vitest';
import { applyDocumentLocale } from './document-locale.js';

function fakeDocument() {
  const element = { lang: '', dir: '' };
  return {
    documentElement: element,
    get root() {
      return element;
    },
  };
}

describe('applyDocumentLocale', () => {
  it('sets lang and ltr for stable locales', () => {
    const doc = fakeDocument();
    const result = applyDocumentLocale('pt-BR', doc);
    expect(result).toEqual({ lang: 'pt-BR', dir: 'ltr' });
    expect(doc.root.lang).toBe('pt-BR');
    expect(doc.root.dir).toBe('ltr');
  });

  it('sets rtl for ar-XB pseudo locale', () => {
    const doc = fakeDocument();
    const result = applyDocumentLocale('ar-XB', doc);
    expect(result).toEqual({ lang: 'ar-XB', dir: 'rtl' });
    expect(doc.root.dir).toBe('rtl');
  });
});
