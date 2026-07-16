import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModuleHub } from '@/components/layout/ModuleHub';

/** Sources hub — no Providers/Tracking/Search rail; pages own their own UI. */
export function SourcesHubPage() {
  return <Outlet />;
}

export function CatalogsHubPage() {
  const { t } = useTranslation();
  return (
    <ModuleHub
      tabs={[
        { to: '/catalogs/studio', label: t('hub.catalogs.tab.studio') },
        { to: '/catalogs/rules', label: t('hub.catalogs.tab.rules') },
        { to: '/catalogs/order', label: t('hub.catalogs.tab.order') },
      ]}
    />
  );
}

export function MetasHubPage() {
  const { t } = useTranslation();
  return (
    <ModuleHub
      tabs={[
        { to: '/metas/fields', label: t('hub.metas.tab.fields') },
        { to: '/metas/language', label: t('hub.metas.tab.language') },
        { to: '/metas/appearance', label: t('hub.metas.tab.appearance') },
      ]}
    />
  );
}

export function ReviewHubPage() {
  const { t } = useTranslation();
  return (
    <ModuleHub
      tabs={[
        { to: '/review/inspector', label: t('hub.review.tab.inspector') },
        { to: '/review/corrections', label: t('hub.review.tab.corrections') },
        { to: '/review/diagnostics', label: t('hub.review.tab.diagnostics') },
      ]}
    />
  );
}
