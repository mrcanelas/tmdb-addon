import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchLogs } from '@/lib/api';

export function LogsPage() {
  const { t } = useTranslation('dashboard');
  const [logs, setLogs] = useState<Array<{ id: string; level: string; message: string; at: string }>>(
    [],
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await fetchLogs();
        setLogs(result.logs);
      } catch {
        setError(true);
      }
    })();
  }, []);

  return (
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('dashboard.logsTitle')}</h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.logsIntro')}</p>
      {error ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}
      <ul className="mt-4 list-none space-y-2 p-0">
        {logs.map((log) => (
          <li key={log.id} className="border-b border-[var(--border)] pb-2">
            <strong>{log.level}</strong> · <span className="ml-text-muted text-sm">{log.at}</span>
            <div>{log.message}</div>
          </li>
        ))}
      </ul>
      {logs.length === 0 && !error ? (
        <p className="ml-text-muted mt-4 text-sm">{t('dashboard.logsEmpty')}</p>
      ) : null}
    </section>
  );
}
