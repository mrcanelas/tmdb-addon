import enUSCommon from '@metalayer/i18n/locales/en-US/common.json';
import ptBRCommon from '@metalayer/i18n/locales/pt-BR/common.json';
import esESCommon from '@metalayer/i18n/locales/es-ES/common.json';
import enXACommon from '@metalayer/i18n/locales/en-XA/common.json';
import arXBCommon from '@metalayer/i18n/locales/ar-XB/common.json';
import enUSSources from '@metalayer/i18n/locales/en-US/sources.json';
import ptBRSources from '@metalayer/i18n/locales/pt-BR/sources.json';
import esESSources from '@metalayer/i18n/locales/es-ES/sources.json';
import enXASources from '@metalayer/i18n/locales/en-XA/sources.json';
import arXBSources from '@metalayer/i18n/locales/ar-XB/sources.json';
import enUSCatalogs from '@metalayer/i18n/locales/en-US/catalogs.json';
import ptBRCatalogs from '@metalayer/i18n/locales/pt-BR/catalogs.json';
import esESCatalogs from '@metalayer/i18n/locales/es-ES/catalogs.json';
import enXACatalogs from '@metalayer/i18n/locales/en-XA/catalogs.json';
import arXBCatalogs from '@metalayer/i18n/locales/ar-XB/catalogs.json';
import enUSRules from '@metalayer/i18n/locales/en-US/rules.json';
import ptBRRules from '@metalayer/i18n/locales/pt-BR/rules.json';
import esESRules from '@metalayer/i18n/locales/es-ES/rules.json';
import enXARules from '@metalayer/i18n/locales/en-XA/rules.json';
import arXBRules from '@metalayer/i18n/locales/ar-XB/rules.json';
import enUSSorting from '@metalayer/i18n/locales/en-US/sorting.json';
import ptBRSorting from '@metalayer/i18n/locales/pt-BR/sorting.json';
import esESSorting from '@metalayer/i18n/locales/es-ES/sorting.json';
import enXASorting from '@metalayer/i18n/locales/en-XA/sorting.json';
import arXBSorting from '@metalayer/i18n/locales/ar-XB/sorting.json';
import enUSInspector from '@metalayer/i18n/locales/en-US/inspector.json';
import ptBRInspector from '@metalayer/i18n/locales/pt-BR/inspector.json';
import esESInspector from '@metalayer/i18n/locales/es-ES/inspector.json';
import enXAInspector from '@metalayer/i18n/locales/en-XA/inspector.json';
import arXBInspector from '@metalayer/i18n/locales/ar-XB/inspector.json';
import enUSTracking from '@metalayer/i18n/locales/en-US/tracking.json';
import ptBRTracking from '@metalayer/i18n/locales/pt-BR/tracking.json';
import esESTracking from '@metalayer/i18n/locales/es-ES/tracking.json';
import enXATracking from '@metalayer/i18n/locales/en-XA/tracking.json';
import arXBTracking from '@metalayer/i18n/locales/ar-XB/tracking.json';
import enUSCorrections from '@metalayer/i18n/locales/en-US/corrections.json';
import ptBRCorrections from '@metalayer/i18n/locales/pt-BR/corrections.json';
import esESCorrections from '@metalayer/i18n/locales/es-ES/corrections.json';
import enXACorrections from '@metalayer/i18n/locales/en-XA/corrections.json';
import arXBCorrections from '@metalayer/i18n/locales/ar-XB/corrections.json';
import enUSSearchAi from '@metalayer/i18n/locales/en-US/searchAi.json';
import ptBRSearchAi from '@metalayer/i18n/locales/pt-BR/searchAi.json';
import esESSearchAi from '@metalayer/i18n/locales/es-ES/searchAi.json';
import enXASearchAi from '@metalayer/i18n/locales/en-XA/searchAi.json';
import arXBSearchAi from '@metalayer/i18n/locales/ar-XB/searchAi.json';
import enUSResolution from '@metalayer/i18n/locales/en-US/resolution.json';
import ptBRResolution from '@metalayer/i18n/locales/pt-BR/resolution.json';
import esESResolution from '@metalayer/i18n/locales/es-ES/resolution.json';
import enXAResolution from '@metalayer/i18n/locales/en-XA/resolution.json';
import arXBResolution from '@metalayer/i18n/locales/ar-XB/resolution.json';
import enUSLanguageRegion from '@metalayer/i18n/locales/en-US/languageRegion.json';
import ptBRLanguageRegion from '@metalayer/i18n/locales/pt-BR/languageRegion.json';
import esESLanguageRegion from '@metalayer/i18n/locales/es-ES/languageRegion.json';
import enXALanguageRegion from '@metalayer/i18n/locales/en-XA/languageRegion.json';
import arXBLanguageRegion from '@metalayer/i18n/locales/ar-XB/languageRegion.json';
import enUSSaveInstall from '@metalayer/i18n/locales/en-US/saveInstall.json';
import ptBRSaveInstall from '@metalayer/i18n/locales/pt-BR/saveInstall.json';
import esESSaveInstall from '@metalayer/i18n/locales/es-ES/saveInstall.json';
import enXASaveInstall from '@metalayer/i18n/locales/en-XA/saveInstall.json';
import arXBSaveInstall from '@metalayer/i18n/locales/ar-XB/saveInstall.json';
import enUSProfiles from '@metalayer/i18n/locales/en-US/profiles.json';
import ptBRProfiles from '@metalayer/i18n/locales/pt-BR/profiles.json';
import esESProfiles from '@metalayer/i18n/locales/es-ES/profiles.json';
import enXAProfiles from '@metalayer/i18n/locales/en-XA/profiles.json';
import arXBProfiles from '@metalayer/i18n/locales/ar-XB/profiles.json';
import enUSAdvanced from '@metalayer/i18n/locales/en-US/advanced.json';
import ptBRAdvanced from '@metalayer/i18n/locales/pt-BR/advanced.json';
import esESAdvanced from '@metalayer/i18n/locales/es-ES/advanced.json';
import enXAAdvanced from '@metalayer/i18n/locales/en-XA/advanced.json';
import arXBAdvanced from '@metalayer/i18n/locales/ar-XB/advanced.json';

type LocaleBundle = {
  common: typeof enUSCommon;
  sources: typeof enUSSources;
  catalogs: typeof enUSCatalogs;
  rules: typeof enUSRules;
  sorting: typeof enUSSorting;
  inspector: typeof enUSInspector;
  tracking: typeof enUSTracking;
  corrections: typeof enUSCorrections;
  searchAi: typeof enUSSearchAi;
  resolution: typeof enUSResolution;
  languageRegion: typeof enUSLanguageRegion;
  saveInstall: typeof enUSSaveInstall;
  profiles: typeof enUSProfiles;
  advanced: typeof enUSAdvanced;
};

function bundle(parts: LocaleBundle): LocaleBundle {
  return parts;
}

/** Configure SPA message catalogs, including pseudo-locales for layout QA. */
export const configureI18nResources = {
  'en-US': bundle({
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
    profiles: enUSProfiles,
    advanced: enUSAdvanced,
  }),
  'pt-BR': bundle({
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
    profiles: ptBRProfiles,
    advanced: ptBRAdvanced,
  }),
  'es-ES': bundle({
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
    profiles: esESProfiles,
    advanced: esESAdvanced,
  }),
  'en-XA': bundle({
    common: enXACommon,
    sources: enXASources,
    catalogs: enXACatalogs,
    rules: enXARules,
    sorting: enXASorting,
    inspector: enXAInspector,
    tracking: enXATracking,
    corrections: enXACorrections,
    searchAi: enXASearchAi,
    resolution: enXAResolution,
    languageRegion: enXALanguageRegion,
    saveInstall: enXASaveInstall,
    profiles: enXAProfiles,
    advanced: enXAAdvanced,
  }),
  'ar-XB': bundle({
    common: arXBCommon,
    sources: arXBSources,
    catalogs: arXBCatalogs,
    rules: arXBRules,
    sorting: arXBSorting,
    inspector: arXBInspector,
    tracking: arXBTracking,
    corrections: arXBCorrections,
    searchAi: arXBSearchAi,
    resolution: arXBResolution,
    languageRegion: arXBLanguageRegion,
    saveInstall: arXBSaveInstall,
    profiles: arXBProfiles,
    advanced: arXBAdvanced,
  }),
} as const;

export const configureI18nNamespaces = [
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
  'profiles',
  'advanced',
] as const;
