import { useTranslation } from 'react-i18next';
import { Button, StatusBadge } from '@metalayer/shared-ui';
import {
  useHideWatchedPreviewMutation,
  useTrackingStatusQuery,
} from '@/api/hooks/use-tracking';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

function trackingTone(
  state: string,
): 'neutral' | 'success' | 'warning' | 'error' | 'info' {
  switch (state) {
    case 'connected':
      return 'success';
    case 'degraded':
    case 'expired':
    case 'reconnect_required':
      return 'warning';
    case 'invalid':
      return 'error';
    default:
      return 'neutral';
  }
}

export function TrackingPage() {
  const { t } = useTranslation(['tracking', 'common']);
  const sessionQuery = useStudioSessionQuery();
  const statusQuery = useTrackingStatusQuery();
  const previewMutation = useHideWatchedPreviewMutation();

  const providers = statusQuery.data?.providers ?? [];
  const bootstrapping = sessionQuery.isLoading || statusQuery.isLoading;
  const loadError = sessionQuery.isError || statusQuery.isError;

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('tracking.title')}
        description={t('tracking.intro')}
      />

      {bootstrapping ? (
        <LoadingState label={t('tracking.bootstrapping')} />
      ) : null}

      {loadError ? (
        <ErrorState
          message={t('tracking.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void sessionQuery.refetch();
            void statusQuery.refetch();
          }}
        />
      ) : null}

      {!bootstrapping && !loadError ? (
        <SectionCard title={t('tracking.providers')}>
          {providers.length === 0 ? (
            <EmptyState title={t('tracking.emptyTitle')} />
          ) : (
            <ul className="space-y-3">
              {providers.map((provider) => (
                <li
                  key={provider.provider}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ml-border)] pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium text-[var(--ml-text)]">
                    {provider.provider}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={trackingTone(provider.state)}>
                      {t(`tracking.state.${provider.state}`)}
                    </StatusBadge>
                    <span className="text-sm ml-text-muted">
                      {provider.adapterAvailable
                        ? t('tracking.adapterReady')
                        : t('tracking.adapterMissing')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <SectionCard title={t('tracking.preview')}>
        <Button
          type="button"
          onPress={() => {
            void previewMutation.mutateAsync();
          }}
          isDisabled={bootstrapping || loadError || previewMutation.isPending}
        >
          {previewMutation.isPending
            ? t('tracking.previewRunning')
            : t('tracking.preview')}
        </Button>
        {previewMutation.isError ? (
          <p className="mt-3 text-sm text-[var(--ml-error)]" role="alert">
            {t('tracking.loadError')}
          </p>
        ) : null}
        {previewMutation.data ? (
          <div className="mt-3 space-y-1 text-sm text-[var(--ml-text)]">
            <p>
              {t('tracking.previewOk', {
                degraded: String(previewMutation.data.degraded),
              })}
            </p>
            <p>
              {t('tracking.included')}:{' '}
              {previewMutation.data.included.join(', ') || '—'}
            </p>
            <p>
              {t('tracking.excluded')}:{' '}
              {previewMutation.data.excluded.join(', ') || '—'}
            </p>
          </div>
        ) : null}
      </SectionCard>
    </section>
  );
}
