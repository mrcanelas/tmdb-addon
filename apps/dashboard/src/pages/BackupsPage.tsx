import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBackup } from '@/lib/api';

export function BackupsPage() {
  const { t } = useTranslation('dashboard');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function onBackup() {
    try {
      const response = await createBackup();
      setResult(
        JSON.stringify(
          {
            includesSecrets: response.backup.includesSecrets,
            configurations: response.backup.configurations.length,
          },
          null,
          2,
        ),
      );
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <section className="panel">
      <h1>{t('dashboard.backupsTitle')}</h1>
      <p className="muted">{t('dashboard.backupsIntro')}</p>
      <button type="button" className="primary" style={{ marginTop: '1rem' }} onClick={() => void onBackup()}>
        {t('dashboard.backupsAction')}
      </button>
      {error ? <p>{t('dashboard.loadError')}</p> : null}
      {result ? <pre style={{ marginTop: '1rem' }}>{result}</pre> : null}
    </section>
  );
}
