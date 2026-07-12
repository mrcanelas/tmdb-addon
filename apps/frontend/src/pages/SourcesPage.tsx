import { useTranslation } from 'react-i18next';
import { useSourcesQuery } from '@/api/hooks/use-sources';
import { SourceCard } from '@/components/sources/SourceCard';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

export function SourcesPage() {
  const { t } = useTranslation(['sources', 'common']);
  const { data: sources = [], isLoading, isError, refetch, isFetching } =
    useSourcesQuery();

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('sources.title')}
        description={t('sources.intro')}
      />

      {isLoading ? <LoadingState label={t('sources.loading')} /> : null}

      {isError ? (
        <ErrorState
          message={t('sources.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {!isLoading && !isError && sources.length === 0 ? (
        <EmptyState
          title={t('sources.emptyTitle')}
          description={t('sources.emptyBody')}
        />
      ) : null}

      {!isError && sources.length > 0 ? (
        <div className="space-y-3">
          {isFetching && !isLoading ? (
            <LoadingState label={t('sources.refreshing')} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
