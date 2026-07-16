import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@metalayer/shared-ui';
import { getDashboardToken, setDashboardToken } from '@/lib/api';

export function LoginGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('dashboard');
  const [token, setToken] = useState(getDashboardToken());
  const [draft, setDraft] = useState(token);

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <section className="ml-surface p-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {t('dashboard.loginTitle')}
          </h1>
          <p className="ml-text-muted mt-2 text-sm">{t('dashboard.loginIntro')}</p>
          <label className="ml-text-muted mt-4 block text-sm">
            {t('dashboard.tokenLabel')}
            <Input
              type="password"
              className="mt-2"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <Button
            className="mt-4"
            variant="primary"
            onPress={() => {
              setDashboardToken(draft.trim());
              setToken(draft.trim());
            }}
          >
            {t('dashboard.loginAction')}
          </Button>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
