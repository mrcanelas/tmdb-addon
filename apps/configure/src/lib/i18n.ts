import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CANONICAL_LOCALE,
  negotiateInterfaceLocale,
} from '@metalayer/i18n';
import enUS from '@metalayer/i18n/locales/en-US/common.json';
import ptBR from '@metalayer/i18n/locales/pt-BR/common.json';
import esES from '@metalayer/i18n/locales/es-ES/common.json';

const resources = {
  'en-US': { common: enUS },
  'pt-BR': { common: ptBR },
  'es-ES': { common: esES },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: negotiateInterfaceLocale([
    typeof navigator !== 'undefined' ? navigator.language : null,
    CANONICAL_LOCALE,
  ]),
  fallbackLng: CANONICAL_LOCALE,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
