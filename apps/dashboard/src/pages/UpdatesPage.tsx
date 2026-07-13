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
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-[var(--ml-text)]">
        {t('dashboard.updatesTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.updatesIntro')}</p>
      {error ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}
      {data ? (
        <div className="mt-4 space-y-2">
          <p>
            {t('dashboard.currentVersion')}: <strong>{data.currentVersion}</strong>
          </p>
          <p className="ml-text-muted text-sm">
            {t('dashboard.upgradeCommand')}: <code>{data.upgradeCommand}</code>
          </p>
          <ul className="list-disc ps-5">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
