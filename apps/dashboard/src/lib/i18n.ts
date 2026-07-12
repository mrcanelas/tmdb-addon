import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CANONICAL_LOCALE,
  negotiateInterfaceLocale,
} from '@metalayer/i18n';
import enUS from '@metalayer/i18n/locales/en-US/dashboard.json';
import ptBR from '@metalayer/i18n/locales/pt-BR/dashboard.json';
import esES from '@metalayer/i18n/locales/es-ES/dashboard.json';

void i18n.use(initReactI18next).init({
  resources: {
    'en-US': { dashboard: enUS },
    'pt-BR': { dashboard: ptBR },
    'es-ES': { dashboard: esES },
  },
  lng: negotiateInterfaceLocale([
    typeof navigator !== 'undefined' ? navigator.language : null,
    CANONICAL_LOCALE,
  ]),
  fallbackLng: CANONICAL_LOCALE,
  defaultNS: 'dashboard',
  ns: ['dashboard'],
  interpolation: { escapeValue: false },
});

export { i18n };
