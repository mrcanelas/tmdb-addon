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
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-[var(--ml-text)]">
        {t('dashboard.overviewTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.overviewIntro')}</p>
      {status === 'loading' ? (
        <p className="ml-text-muted mt-4 text-sm">{t('dashboard.loading')}</p>
      ) : null}
      {status === 'error' ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}
      {data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['dashboard.metric.status', data.health.status],
              ['dashboard.metric.mode', data.health.mode],
              ['dashboard.metric.version', data.health.version],
              ['dashboard.metric.configs', String(data.health.activeConfigurations ?? 0)],
              ['dashboard.metric.uptime', `${data.health.uptimeSeconds}s`],
            ] as const
          ).map(([labelKey, value]) => (
            <div key={labelKey} className="ml-elevated p-3">
              <span className="ml-text-muted text-sm">{t(labelKey)}</span>
              <strong className="mt-1 block text-lg text-[var(--ml-text)]">{value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
