import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CANONICAL_LOCALE,
  applyDocumentLocale,
  negotiateInterfaceLocale,
} from '@metalayer/i18n';
import {
  dashboardI18nNamespaces,
  dashboardI18nResources,
} from './i18n-resources.js';

void i18n
  .use(initReactI18next)
  .init({
    resources: dashboardI18nResources,
    lng: negotiateInterfaceLocale([
      typeof navigator !== 'undefined' ? navigator.language : null,
      CANONICAL_LOCALE,
    ]),
    fallbackLng: CANONICAL_LOCALE,
    defaultNS: 'dashboard',
    ns: [...dashboardI18nNamespaces],
    interpolation: { escapeValue: false },
  })
  .then(() => {
    if (typeof document !== 'undefined') {
      applyDocumentLocale(i18n.language);
    }
  });

i18n.on('languageChanged', (locale) => {
  if (typeof document !== 'undefined') {
    applyDocumentLocale(locale);
  }
});

export { i18n };
