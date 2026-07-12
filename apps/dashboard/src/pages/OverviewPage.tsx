import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchOverview } from '@/lib/api';

export function OverviewPage() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchOverview>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchOverview();
        if (!cancelled) {
          setData(result);
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

  return (
    <section className="panel">
      <h1>{t('dashboard.overviewTitle')}</h1>
      <p className="muted">{t('dashboard.overviewIntro')}</p>
      {status === 'loading' ? <p className="muted">{t('dashboard.loading')}</p> : null}
      {status === 'error' ? <p>{t('dashboard.loadError')}</p> : null}
      {data ? (
        <div className="grid" style={{ marginTop: '1rem' }}>
          <div className="metric">
            <span className="muted">{t('dashboard.metric.status')}</span>
            <strong>{data.health.status}</strong>
          </div>
          <div className="metric">
            <span className="muted">{t('dashboard.metric.mode')}</span>
            <strong>{data.health.mode}</strong>
          </div>
          <div className="metric">
            <span className="muted">{t('dashboard.metric.version')}</span>
            <strong>{data.health.version}</strong>
          </div>
          <div className="metric">
            <span className="muted">{t('dashboard.metric.configs')}</span>
            <strong>{data.health.activeConfigurations ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="muted">{t('dashboard.metric.uptime')}</span>
            <strong>{data.health.uptimeSeconds}s</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
