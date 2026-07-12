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
import enUSCatalogs from '@metalayer/i18n/locales/en-US/catalogs.json';
import ptBRCatalogs from '@metalayer/i18n/locales/pt-BR/catalogs.json';
import esESCatalogs from '@metalayer/i18n/locales/es-ES/catalogs.json';

const resources = {
  'en-US': { common: enUSCommon, sources: enUSSources, catalogs: enUSCatalogs },
  'pt-BR': { common: ptBRCommon, sources: ptBRSources, catalogs: ptBRCatalogs },
  'es-ES': { common: esESCommon, sources: esESSources, catalogs: esESCatalogs },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: negotiateInterfaceLocale([
    typeof navigator !== 'undefined' ? navigator.language : null,
    CANONICAL_LOCALE,
  ]),
  fallbackLng: CANONICAL_LOCALE,
  defaultNS: 'common',
  ns: ['common', 'sources', 'catalogs'],
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
