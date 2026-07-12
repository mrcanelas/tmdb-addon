import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
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
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-[var(--ml-text)]">
        {t('dashboard.backupsTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.backupsIntro')}</p>
      <Button className="mt-4" variant="primary" onPress={() => void onBackup()}>
        {t('dashboard.backupsAction')}
      </Button>
      {error ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}
      {result ? (
        <pre className="mt-4 overflow-auto rounded bg-[#0f1a17] p-3 text-sm text-[#d7ece4]">
          {result}
        </pre>
      ) : null}
    </section>
  );
}
