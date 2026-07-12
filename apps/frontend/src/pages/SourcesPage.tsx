import { useTranslation } from 'react-i18next';
import { SourceCard } from '@/components/sources/SourceCard';
import { useSourcesQuery } from '@/api/hooks/use-sources';
import { Spinner } from '@metalayer/shared-ui';

export function SourcesPage() {
  const { t } = useTranslation('sources');
  const { data: sources = [], isLoading, isError } = useSourcesQuery();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ml-text)]">
          {t('sources.title')}
        </h1>
        <p className="max-w-2xl ml-text-muted">{t('sources.intro')}</p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm ml-text-muted">
            <Spinner size="sm" />
            <span>{t('sources.loading')}</span>
          </div>
        ) : null}
        {isError ? (
          <p className="text-sm text-amber-400">{t('sources.loadError')}</p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}
