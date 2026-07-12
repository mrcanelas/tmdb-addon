import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { useConfigureUiStore } from '@/stores/ui-store';

export function OverviewPage() {
  const { t } = useTranslation();
  const mode = useConfigureUiStore((s) => s.mode);

  return (
    <section className="space-y-6">
      <PageHeader title={t('nav.overview')} description={t('overview.body')} />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title={t('overview.nextStepsTitle')}
          description={t('overview.nextStepsBody')}
        >
          <div className="flex flex-wrap gap-2">
            <Link to="/sources">
              <Button type="button">{t('overview.ctaSources')}</Button>
            </Link>
            <Link to="/language-region">
              <Button type="button" variant="outline">
                {t('overview.ctaLanguage')}
              </Button>
            </Link>
            <Link to="/catalog-studio">
              <Button type="button" variant="outline">
                {t('overview.ctaCatalogStudio')}
              </Button>
            </Link>
            <Link to="/save-install">
              <Button type="button" variant="quiet">
                {t('overview.ctaSave')}
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title={t('overview.modeTitle')}
          description={
            mode === 'simple'
              ? t('overview.modeSimpleBody')
              : t('overview.modeAdvancedBody')
          }
        >
          <p className="text-sm ml-text-muted">{t('overview.importHint')}</p>
          <Button type="button" variant="outline" className="mt-3" isDisabled>
            {t('overview.ctaImport')}
          </Button>
        </SectionCard>
      </div>
    </section>
  );
}
