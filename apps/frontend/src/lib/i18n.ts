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
import enUSTracking from '@metalayer/i18n/locales/en-US/tracking.json';
import ptBRTracking from '@metalayer/i18n/locales/pt-BR/tracking.json';
import esESTracking from '@metalayer/i18n/locales/es-ES/tracking.json';
import enUSCorrections from '@metalayer/i18n/locales/en-US/corrections.json';
import ptBRCorrections from '@metalayer/i18n/locales/pt-BR/corrections.json';
import esESCorrections from '@metalayer/i18n/locales/es-ES/corrections.json';
import enUSSearchAi from '@metalayer/i18n/locales/en-US/searchAi.json';
import ptBRSearchAi from '@metalayer/i18n/locales/pt-BR/searchAi.json';
import esESSearchAi from '@metalayer/i18n/locales/es-ES/searchAi.json';
import enUSResolution from '@metalayer/i18n/locales/en-US/resolution.json';
import ptBRResolution from '@metalayer/i18n/locales/pt-BR/resolution.json';
import esESResolution from '@metalayer/i18n/locales/es-ES/resolution.json';
import enUSLanguageRegion from '@metalayer/i18n/locales/en-US/languageRegion.json';
import ptBRLanguageRegion from '@metalayer/i18n/locales/pt-BR/languageRegion.json';
import esESLanguageRegion from '@metalayer/i18n/locales/es-ES/languageRegion.json';
import enUSSaveInstall from '@metalayer/i18n/locales/en-US/saveInstall.json';
import ptBRSaveInstall from '@metalayer/i18n/locales/pt-BR/saveInstall.json';
import esESSaveInstall from '@metalayer/i18n/locales/es-ES/saveInstall.json';

const resources = {
  'en-US': {
    common: enUSCommon,
    sources: enUSSources,
    catalogs: enUSCatalogs,
    rules: enUSRules,
    sorting: enUSSorting,
    inspector: enUSInspector,
    tracking: enUSTracking,
    corrections: enUSCorrections,
    searchAi: enUSSearchAi,
    resolution: enUSResolution,
    languageRegion: enUSLanguageRegion,
    saveInstall: enUSSaveInstall,
  },
  'pt-BR': {
    common: ptBRCommon,
    sources: ptBRSources,
    catalogs: ptBRCatalogs,
    rules: ptBRRules,
    sorting: ptBRSorting,
    inspector: ptBRInspector,
    tracking: ptBRTracking,
    corrections: ptBRCorrections,
    searchAi: ptBRSearchAi,
    resolution: ptBRResolution,
    languageRegion: ptBRLanguageRegion,
    saveInstall: ptBRSaveInstall,
  },
  'es-ES': {
    common: esESCommon,
    sources: esESSources,
    catalogs: esESCatalogs,
    rules: esESRules,
    sorting: esESSorting,
    inspector: esESInspector,
    tracking: esESTracking,
    corrections: esESCorrections,
    searchAi: esESSearchAi,
    resolution: esESResolution,
    languageRegion: esESLanguageRegion,
    saveInstall: esESSaveInstall,
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
  ns: [
    'common',
    'sources',
    'catalogs',
    'rules',
    'sorting',
    'inspector',
    'tracking',
    'corrections',
    'searchAi',
    'resolution',
    'languageRegion',
    'saveInstall',
  ],
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
