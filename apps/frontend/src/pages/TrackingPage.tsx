import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  fetchTrackingStatus,
  previewHideWatched,
  type TrackingProviderStatus,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

export function TrackingPage() {
  const { t } = useTranslation('tracking');
  const [providers, setProviders] = useState<TrackingProviderStatus[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await ensureStudioSession();
        const result = await fetchTrackingStatus(
          session.configId,
          session.editCredential,
        );
        if (!cancelled) {
          setProviders(result.providers);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onPreview() {
    try {
      const session = await ensureStudioSession();
      const result = await previewHideWatched(
        session.configId,
        session.editCredential,
        {
          hideWatched: true,
          items: [
            { id: 'tt0137523', title: 'Fight Club' },
            { id: 'tt0111161', title: 'Shawshank' },
          ],
          fixtures: [
            {
              provider: 'trakt',
              mediaType: 'movie',
              status: 'completed',
              externalIds: { imdb: 'tt0137523' },
            },
          ],
        },
      );
      setIncluded(result.included);
      setExcluded(result.excluded);
      setDegraded(result.degraded);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('tracking.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('tracking.intro')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('tracking.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{t('tracking.loadError')}</p>
        ) : null}
      </header>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{t('tracking.providers')}</h2>
        <ul className="space-y-2">
          {providers.map((provider) => (
            <li
              key={provider.provider}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2"
            >
              <span className="font-medium">{provider.provider}</span>
              <span className="text-sm text-muted-foreground">
                {t(`tracking.state.${provider.state}`)} ·{' '}
                {provider.adapterAvailable
                  ? t('tracking.adapterReady')
                  : t('tracking.adapterMissing')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button type="button" onClick={() => void onPreview()}>
          {t('tracking.preview')}
        </Button>
        {included.length > 0 || excluded.length > 0 ? (
          <div className="space-y-1 text-sm">
            <p>{t('tracking.previewOk', { degraded: String(degraded) })}</p>
            <p>
              {t('tracking.included')}: {included.join(', ') || '—'}
            </p>
            <p>
              {t('tracking.excluded')}: {excluded.join(', ') || '—'}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
