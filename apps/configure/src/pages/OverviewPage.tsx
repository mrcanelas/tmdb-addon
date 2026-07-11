import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function OverviewPage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t('nav.overview')}
      </h1>
      <p className="max-w-2xl text-muted-foreground">{t('overview.body')}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="button" asChild>
          <Link to="/sources">{t('overview.ctaSources')}</Link>
        </Button>
        <Button type="button" variant="outline" disabled>
          {t('overview.ctaImport')}
        </Button>
      </div>
    </section>
  );
}
