import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CANONICAL_LOCALE,
  negotiateInterfaceLocale,
} from '@metalayer/i18n';
import enUSCommon from '@metalayer/i18n/locales/en-US/common.json';
import ptBRCommon from '@metalayer/i18n/locales/pt-BR/common.json';
import esESCommon from '@metalayer/i18n/locales/es-ES/common.json';
import enUSSources from '@metalayer/i18n/locales/en-US/sources.json';
import ptBRSources from '@metalayer/i18n/locales/pt-BR/sources.json';
import esESSources from '@metalayer/i18n/locales/es-ES/sources.json';

const resources = {
  'en-US': { common: enUSCommon, sources: enUSSources },
  'pt-BR': { common: ptBRCommon, sources: ptBRSources },
  'es-ES': { common: esESCommon, sources: esESSources },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: negotiateInterfaceLocale([
    typeof navigator !== 'undefined' ? navigator.language : null,
    CANONICAL_LOCALE,
  ]),
  fallbackLng: CANONICAL_LOCALE,
  defaultNS: 'common',
  ns: ['common', 'sources'],
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
