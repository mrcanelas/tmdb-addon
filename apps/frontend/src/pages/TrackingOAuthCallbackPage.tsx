import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTrackingCallbackMutation } from '@/api/hooks/use-tracking';
import type { TrackingOAuthProvider } from '@/lib/api';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const OAUTH_PROVIDERS = new Set<TrackingOAuthProvider>(['trakt', 'simkl']);

function brandLabel(provider: TrackingOAuthProvider): string {
  return provider === 'simkl' ? 'SIMKL' : 'Trakt';
}

export function TrackingOAuthCallbackPage() {
  const { t } = useTranslation(['tracking', 'common']);
  const { provider: providerParam } = useParams<{ provider: string }>();
  const [params] = useSearchParams();
  const provider = (
    OAUTH_PROVIDERS.has(providerParam as TrackingOAuthProvider)
      ? providerParam
      : 'trakt'
  ) as TrackingOAuthProvider;
  const brand = brandLabel(provider);
  const callbackMutation = useTrackingCallbackMutation(provider);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const code = params.get('code');
    if (!code || callbackMutation.isPending || done) return;
    if (!OAUTH_PROVIDERS.has(providerParam as TrackingOAuthProvider)) {
      setDone(true);
      return;
    }
    const redirectUri = `${window.location.origin}/configure/oauth/${provider}/callback`;
    void callbackMutation
      .mutateAsync({ code, redirectUri })
      .then(() => {
        setDone(true);
        window.close();
      })
      .catch(() => {
        setDone(true);
      });
  }, [params, callbackMutation, done, provider, providerParam]);

  const invalidProvider = !OAUTH_PROVIDERS.has(
    providerParam as TrackingOAuthProvider,
  );

  return (
    <section className="space-y-6 p-6">
      <PageHeader
        title={t('tracking.oauth.title', { provider: brand })}
        description={t('tracking.oauth.intro', { provider: brand })}
      />
      {invalidProvider ? (
        <ErrorState message={t('tracking.oauth.error', { provider: brand })} />
      ) : null}
      {!invalidProvider && callbackMutation.isPending ? (
        <LoadingState
          label={t('tracking.oauth.connecting', { provider: brand })}
        />
      ) : null}
      {!invalidProvider && callbackMutation.isError ? (
        <ErrorState message={t('tracking.oauth.error', { provider: brand })} />
      ) : null}
      {!invalidProvider && callbackMutation.isSuccess ? (
        <p className="text-sm text-[var(--ml-text)]" role="status">
          {t('tracking.oauth.success', { provider: brand })}
        </p>
      ) : null}
    </section>
  );
}
