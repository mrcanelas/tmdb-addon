import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import { applyDocumentLocale } from '@metalayer/i18n';
import {
  dashboardI18nNamespaces,
  dashboardI18nResources,
} from './i18n-resources.js';

describe('dashboard i18n pseudo-locales', () => {
  it('exposes en-XA and ar-XB catalogs alongside stable locales', () => {
    expect(Object.keys(dashboardI18nResources)).toEqual(
      expect.arrayContaining(['en-US', 'pt-BR', 'es-ES', 'en-XA', 'ar-XB']),
    );
    expect(
      dashboardI18nResources['en-XA'].dashboard['dashboard.appName'],
    ).not.toBe(dashboardI18nResources['en-US'].dashboard['dashboard.appName']);
    expect(
      dashboardI18nResources['ar-XB'].dashboard['dashboard.appName'],
    ).toContain('MetaLayer');
  });

  it('resolves expanded en-XA and rtl ar-XB strings without falling back to en-US', async () => {
    const instance = createInstance();
    await instance.init({
      resources: dashboardI18nResources,
      lng: 'en-US',
      fallbackLng: 'en-US',
      defaultNS: 'dashboard',
      ns: [...dashboardI18nNamespaces],
      interpolation: { escapeValue: false },
    });

    const enUs = instance.t('dashboard.appName');
    await instance.changeLanguage('en-XA');
    const enXa = instance.t('dashboard.appName');
    expect(enXa).not.toBe(enUs);
    expect(enXa.length).toBeGreaterThan(enUs.length);

    await instance.changeLanguage('ar-XB');
    const arXb = instance.t('dashboard.appName');
    expect(arXb).not.toBe(enUs);
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
