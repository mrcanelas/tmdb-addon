import enUS from '@metalayer/i18n/locales/en-US/dashboard.json';
import ptBR from '@metalayer/i18n/locales/pt-BR/dashboard.json';
import esES from '@metalayer/i18n/locales/es-ES/dashboard.json';
import enXA from '@metalayer/i18n/locales/en-XA/dashboard.json';
import arXB from '@metalayer/i18n/locales/ar-XB/dashboard.json';

/** Dashboard SPA catalogs, including pseudo-locales for layout QA. */
export const dashboardI18nResources = {
  'en-US': { dashboard: enUS },
  'pt-BR': { dashboard: ptBR },
  'es-ES': { dashboard: esES },
  'en-XA': { dashboard: enXA },
  'ar-XB': { dashboard: arXB },
} as const;

export const dashboardI18nNamespaces = ['dashboard'] as const;
