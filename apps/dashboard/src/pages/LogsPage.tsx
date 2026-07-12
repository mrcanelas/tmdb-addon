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
    <section className="panel">
      <h1>{t('dashboard.logsTitle')}</h1>
      <p className="muted">{t('dashboard.logsIntro')}</p>
      {error ? <p>{t('dashboard.loadError')}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {logs.map((log) => (
          <li key={log.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
            <strong>{log.level}</strong> · <span className="muted">{log.at}</span>
            <div>{log.message}</div>
          </li>
        ))}
      </ul>
      {logs.length === 0 && !error ? <p className="muted">{t('dashboard.logsEmpty')}</p> : null}
    </section>
  );
}
