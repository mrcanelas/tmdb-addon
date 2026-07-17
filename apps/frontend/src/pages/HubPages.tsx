import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModuleHub } from '@/components/layout/ModuleHub';

/** Sources hub — no Providers/Tracking/Search rail; pages own their own UI. */
export function SourcesHubPage() {
  return <Outlet />;
}

/** Catalogs hub — Studio is the only surface; rules live in the catalog edit modal. */
export function CatalogsHubPage() {
  return <Outlet />;
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
