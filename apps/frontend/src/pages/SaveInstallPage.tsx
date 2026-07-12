import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

function manifestHttpUrl(configId: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/c/${configId}/manifest.json`;
}

function stremioInstallUrl(httpUrl: string): string {
  return `stremio://${httpUrl.replace(/^https?:\/\//, '')}`;
}

export function SaveInstallPage() {
  const { t } = useTranslation(['saveInstall', 'common']);
  const sessionQuery = useStudioSessionQuery();
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');

  const configId = sessionQuery.data?.configId;
  const httpUrl = configId ? manifestHttpUrl(configId) : '';
  const installUrl = httpUrl ? stremioInstallUrl(httpUrl) : '';


  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('ok');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('saveInstall.title')}
        description={t('saveInstall.intro')}
      />

      {sessionQuery.isLoading ? (
        <LoadingState label={t('saveInstall.loading')} />
      ) : null}

      {sessionQuery.isError ? (
        <ErrorState
          message={t('saveInstall.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void sessionQuery.refetch();
          }}
        />
      ) : null}

      {configId ? (
        <>
          <SectionCard
            title={t('saveInstall.section.manifest')}
            description={t('saveInstall.manifestHint')}
          >
            <p className="break-all font-mono text-sm text-[var(--ml-text)]">
              {httpUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onPress={() => {
                  void copy(httpUrl);
                }}
              >
                {t('saveInstall.copyUrl')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onPress={() => {
                  window.open(installUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                {t('saveInstall.openStremio')}
              </Button>
            </div>
            {copyState === 'ok' ? (
              <p className="mt-3 text-sm text-[var(--ml-text)]" role="status">
                {t('saveInstall.copyOk')}
              </p>
            ) : null}
            {copyState === 'error' ? (
              <p className="mt-3 text-sm text-[var(--ml-error)]" role="alert">
                {t('saveInstall.copyError')}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title={t('saveInstall.section.config')}>
            <dl className="grid gap-2 text-sm text-[var(--ml-text)]">
              <div className="flex flex-wrap gap-2">
                <dt className="ml-text-muted">{t('saveInstall.configId')}</dt>
                <dd className="font-mono">{configId}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm ml-text-muted">
              {t('saveInstall.editHint')}
            </p>
          </SectionCard>
        </>
      ) : null}
    </section>
  );
}
