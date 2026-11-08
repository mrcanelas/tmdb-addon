import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import { applyDocumentLocale } from '@metalayer/i18n';
import {
  configureI18nNamespaces,
  configureI18nResources,
} from './i18n-resources.js';

describe('configure i18n pseudo-locales', () => {
  it('exposes en-XA and ar-XB catalogs alongside stable locales', () => {
    expect(Object.keys(configureI18nResources)).toEqual(
      expect.arrayContaining(['en-US', 'pt-BR', 'es-ES', 'en-XA', 'ar-XB']),
    );
    expect(configureI18nResources['en-XA'].common['common.appName']).not.toBe(
      configureI18nResources['en-US'].common['common.appName'],
    );
    expect(configureI18nResources['ar-XB'].common['common.appName']).toContain(
      'MetaLayer',
    );
  });

  it('resolves expanded en-XA and rtl ar-XB strings without falling back to en-US', async () => {
    const instance = createInstance();
    await instance.init({
      resources: configureI18nResources,
      lng: 'en-US',
      fallbackLng: 'en-US',
      defaultNS: 'common',
      ns: [...configureI18nNamespaces],
      interpolation: { escapeValue: false },
    });

    const enUs = instance.t('common.appName');
    await instance.changeLanguage('en-XA');
    const enXa = instance.t('common.appName');
    expect(enXa).not.toBe(enUs);
    expect(enXa.length).toBeGreaterThan(enUs.length);

    await instance.changeLanguage('ar-XB');
    const arXb = instance.t('common.appName');
    expect(arXb).not.toBe(enUs);
    // Pseudo RTL wraps with U+200F / U+200E marks.
    expect(arXb.charCodeAt(0)).toBe(0x200f);

    const doc = {
      documentElement: { lang: '', dir: '' },
    };
    expect(applyDocumentLocale('ar-XB', doc)).toEqual({
      lang: 'ar-XB',
      dir: 'rtl',
    });
    expect(doc.documentElement.dir).toBe('rtl');
  });
});
