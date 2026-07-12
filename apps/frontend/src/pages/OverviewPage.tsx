import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function OverviewPage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--ml-text)]">
        {t('nav.overview')}
      </h1>
      <p className="ml-text-muted max-w-2xl">{t('overview.body')}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/sources">
          <Button type="button">{t('overview.ctaSources')}</Button>
        </Link>
        <Link to="/catalog-studio">
          <Button type="button" variant="outline">
            {t('overview.ctaCatalogStudio')}
          </Button>
        </Link>
        <Button type="button" variant="outline" disabled>
          {t('overview.ctaImport')}
        </Button>
      </div>
    </section>
  );
}
