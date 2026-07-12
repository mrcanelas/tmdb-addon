import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTraktCallbackMutation } from '@/api/hooks/use-tracking';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

export function TraktOAuthCallbackPage() {
  const { t } = useTranslation(['tracking', 'common']);
  const [params] = useSearchParams();
  const callbackMutation = useTraktCallbackMutation();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const code = params.get('code');
    if (!code || callbackMutation.isPending || done) return;
    const redirectUri = `${window.location.origin}/configure/oauth/trakt/callback`;
    void callbackMutation
      .mutateAsync({ code, redirectUri })
      .then(() => {
        setDone(true);
        window.close();
      })
      .catch(() => {
        setDone(true);
      });
  }, [params, callbackMutation, done]);

  return (
    <section className="space-y-6 p-6">
      <PageHeader
        title={t('tracking.oauth.title')}
        description={t('tracking.oauth.intro')}
      />
      {callbackMutation.isPending ? (
        <LoadingState label={t('tracking.oauth.connecting')} />
      ) : null}
      {callbackMutation.isError ? (
        <ErrorState message={t('tracking.oauth.error')} />
      ) : null}
      {callbackMutation.isSuccess ? (
        <p className="text-sm text-[var(--ml-text)]" role="status">
          {t('tracking.oauth.success')}
        </p>
      ) : null}
    </section>
  );
}
