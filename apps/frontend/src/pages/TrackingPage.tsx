import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@metalayer/shared-ui';
import {
  useHideWatchedPreviewMutation,
  useTrackingConnectMutation,
  useTrackingDisconnectMutation,
  useTrackingStatusQuery,
} from '@/api/hooks/use-tracking';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import type { TrackingOAuthProvider } from '@/lib/api';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

const OAUTH_PROVIDERS = new Set<TrackingOAuthProvider>([
  'trakt',
  'simkl',
  'anilist',
  'mal',
]);

const OAUTH_ORDER: TrackingOAuthProvider[] = [
  'trakt',
  'simkl',
  'anilist',
  'mal',
];

function trackingChipColor(
  state: string,
): 'default' | 'success' | 'warning' | 'danger' | 'accent' {
  switch (state) {
    case 'connected':
      return 'success';
    case 'degraded':
    case 'expired':
    case 'reconnect_required':
      return 'warning';
    case 'invalid':
      return 'danger';
    default:
      return 'default';
  }
}

function brandLabel(provider: TrackingOAuthProvider): string {
  switch (provider) {
    case 'simkl':
      return 'SIMKL';
    case 'anilist':
      return 'AniList';
    case 'mal':
      return 'MyAnimeList';
    default:
      return 'Trakt';
  }
}

function pickPreviewProvider(
  connected: Partial<Record<TrackingOAuthProvider, boolean>>,
): TrackingOAuthProvider {
  for (const provider of OAUTH_ORDER) {
    if (connected[provider]) return provider;
  }
  return 'trakt';
}

export function TrackingPage() {
  const { t } = useTranslation(['tracking', 'common']);
  usePageHeader(t('tracking.title'), t('tracking.intro'));
  const sessionQuery = useStudioSessionQuery();
  const statusQuery = useTrackingStatusQuery();
  const providers = statusQuery.data?.providers ?? [];
  const connected: Partial<Record<TrackingOAuthProvider, boolean>> = {
    trakt:
      providers.find((provider) => provider.provider === 'trakt')?.state ===
      'connected',
    simkl:
      providers.find((provider) => provider.provider === 'simkl')?.state ===
      'connected',
    anilist:
      providers.find((provider) => provider.provider === 'anilist')?.state ===
      'connected',
    mal:
      providers.find((provider) => provider.provider === 'mal')?.state ===
      'connected',
  };
  const previewProvider = pickPreviewProvider(connected);
  const previewMutation = useHideWatchedPreviewMutation(previewProvider);
  const traktConnect = useTrackingConnectMutation('trakt');
  const traktDisconnect = useTrackingDisconnectMutation('trakt');
  const simklConnect = useTrackingConnectMutation('simkl');
  const simklDisconnect = useTrackingDisconnectMutation('simkl');
  const anilistConnect = useTrackingConnectMutation('anilist');
  const anilistDisconnect = useTrackingDisconnectMutation('anilist');
  const malConnect = useTrackingConnectMutation('mal');
  const malDisconnect = useTrackingDisconnectMutation('mal');

  const bootstrapping = sessionQuery.isLoading || statusQuery.isLoading;
  const loadError = sessionQuery.isError || statusQuery.isError;
  const anyTrackingConnected = OAUTH_ORDER.some((id) => connected[id]);
  const connectPending =
    traktConnect.isPending ||
    simklConnect.isPending ||
    anilistConnect.isPending ||
    malConnect.isPending;
  const connectError =
    traktConnect.isError ||
    simklConnect.isError ||
    anilistConnect.isError ||
    malConnect.isError;
  const failedConnectBrand = traktConnect.isError
    ? 'Trakt'
    : simklConnect.isError
      ? 'SIMKL'
      : anilistConnect.isError
        ? 'AniList'
        : 'MyAnimeList';

  function connectMutation(provider: TrackingOAuthProvider) {
    if (provider === 'simkl') return simklConnect;
    if (provider === 'anilist') return anilistConnect;
    if (provider === 'mal') return malConnect;
    return traktConnect;
  }

  function disconnectMutation(provider: TrackingOAuthProvider) {
    if (provider === 'simkl') return simklDisconnect;
    if (provider === 'anilist') return anilistDisconnect;
    if (provider === 'mal') return malDisconnect;
    return traktDisconnect;
  }

  return (
    <section className="space-y-6">
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
              {providers.map((provider) => {
                const oauthProvider = provider.provider as TrackingOAuthProvider;
                const supportsOauth = OAUTH_PROVIDERS.has(oauthProvider);
                return (
                  <li
                    key={provider.provider}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="font-medium text-[var(--foreground)]">
                      {supportsOauth
                        ? brandLabel(oauthProvider)
                        : provider.provider}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={trackingChipColor(provider.state)}
                      >
                        {t(`tracking.state.${provider.state}`)}
                      </Chip>
                      <span className="text-sm ml-text-muted">
                        {provider.adapterAvailable
                          ? t('tracking.adapterReady')
                          : t('tracking.adapterMissing')}
                      </span>
                      {supportsOauth ? (
                        provider.state === 'connected' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onPress={() => {
                              void disconnectMutation(oauthProvider)
                                .mutateAsync()
                                .then(() => {
                                  void statusQuery.refetch();
                                });
                            }}
                            isDisabled={
                              disconnectMutation(oauthProvider).isPending
                            }
                          >
                            {t('tracking.actions.disconnect')}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onPress={() => {
                              void connectMutation(oauthProvider).mutateAsync();
                            }}
                            isDisabled={connectPending}
                          >
                            {t('tracking.actions.connect')}
                          </Button>
                        )
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {connectError ? (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {t('tracking.oauth.error', { provider: failedConnectBrand })}
            </p>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title={t('tracking.preview')}>
        <Button
          type="button"
          onPress={() => {
            void previewMutation.mutateAsync();
          }}
          isDisabled={
            bootstrapping ||
            loadError ||
            previewMutation.isPending ||
            !anyTrackingConnected
          }
        >
          {previewMutation.isPending
            ? t('tracking.previewRunning')
            : t('tracking.preview')}
        </Button>
        {!anyTrackingConnected ? (
          <p className="mt-3 text-sm ml-text-muted">
            {t('tracking.previewNeedsConnection')}
          </p>
        ) : null}
        {previewMutation.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {t('tracking.loadError')}
          </p>
        ) : null}
        {previewMutation.data ? (
          <div className="mt-3 space-y-1 text-sm text-[var(--foreground)]" role="status">
            <p>
              {t('tracking.previewOk', {
                degraded: previewMutation.data.degraded
                  ? t('tracking.previewDegraded.yes')
                  : t('tracking.previewDegraded.no'),
              })}
            </p>
            <p>
              {t('tracking.includedLine', {
                list:
                  previewMutation.data.included.join(', ') ||
                  t('common.emptyValue', { ns: 'common' }),
              })}
            </p>
            <p>
              {t('tracking.excludedLine', {
                list:
                  previewMutation.data.excluded.join(', ') ||
                  t('common.emptyValue', { ns: 'common' }),
              })}
            </p>
          </div>
        ) : null}
      </SectionCard>
    </section>
  );
}
