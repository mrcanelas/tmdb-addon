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
import enUSRules from '@metalayer/i18n/locales/en-US/rules.json';
import ptBRRules from '@metalayer/i18n/locales/pt-BR/rules.json';
import esESRules from '@metalayer/i18n/locales/es-ES/rules.json';
import enUSSorting from '@metalayer/i18n/locales/en-US/sorting.json';
import ptBRSorting from '@metalayer/i18n/locales/pt-BR/sorting.json';
import esESSorting from '@metalayer/i18n/locales/es-ES/sorting.json';
import enUSInspector from '@metalayer/i18n/locales/en-US/inspector.json';
import ptBRInspector from '@metalayer/i18n/locales/pt-BR/inspector.json';
import esESInspector from '@metalayer/i18n/locales/es-ES/inspector.json';

const resources = {
  'en-US': {
    common: enUSCommon,
    sources: enUSSources,
    catalogs: enUSCatalogs,
    rules: enUSRules,
    sorting: enUSSorting,
    inspector: enUSInspector,
  },
  'pt-BR': {
    common: ptBRCommon,
    sources: ptBRSources,
    catalogs: ptBRCatalogs,
    rules: ptBRRules,
    sorting: ptBRSorting,
    inspector: ptBRInspector,
  },
  'es-ES': {
    common: esESCommon,
    sources: esESSources,
    catalogs: esESCatalogs,
    rules: esESRules,
    sorting: esESSorting,
    inspector: esESInspector,
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: negotiateInterfaceLocale([
    typeof navigator !== 'undefined' ? navigator.language : null,
    CANONICAL_LOCALE,
  ]),
  fallbackLng: CANONICAL_LOCALE,
  defaultNS: 'common',
  ns: ['common', 'sources', 'catalogs', 'rules', 'sorting', 'inspector'],
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
