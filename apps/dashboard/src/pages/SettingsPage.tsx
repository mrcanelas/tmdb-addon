import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchSettings } from '@/lib/api';

export function SettingsPage() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSettings>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchSettings();
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
      <h1 className="text-2xl font-semibold text-foreground">
        {t('dashboard.settingsTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.settingsIntro')}</p>

      {status === 'loading' ? (
        <p className="ml-text-muted mt-4 text-sm">{t('dashboard.loading')}</p>
      ) : null}
      {status === 'error' ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}

      {data ? (
        <>
          <div className="ml-elevated mt-4 p-3">
            <span className="ml-text-muted text-sm">{t('dashboard.metric.mode')}</span>
            <strong className="mt-1 block text-lg text-foreground">{data.mode}</strong>
          </div>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded border border-border">
            {data.settings.map((setting) => (
              <div
                key={setting.key}
                className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <strong className="block text-foreground">{setting.key}</strong>
                  <span className="ml-text-muted text-sm">{setting.description}</span>
                </div>
                <span className="text-sm text-foreground">
                  {t(`dashboard.setting.reload.${setting.reload}`)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
