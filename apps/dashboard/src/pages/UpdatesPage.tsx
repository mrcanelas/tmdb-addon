import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchUpdates } from '@/lib/api';

export function UpdatesPage() {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchUpdates>> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setData(await fetchUpdates());
      } catch {
        setError(true);
      }
    })();
  }, []);

  return (
    <section className="panel">
      <h1>{t('dashboard.updatesTitle')}</h1>
      <p className="muted">{t('dashboard.updatesIntro')}</p>
      {error ? <p>{t('dashboard.loadError')}</p> : null}
      {data ? (
        <div style={{ marginTop: '1rem' }}>
          <p>
            {t('dashboard.currentVersion')}: <strong>{data.currentVersion}</strong>
          </p>
          <p className="muted">
            {t('dashboard.upgradeCommand')}: <code>{data.upgradeCommand}</code>
          </p>
          <ul>
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
