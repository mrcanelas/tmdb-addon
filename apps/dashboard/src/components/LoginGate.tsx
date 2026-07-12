import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getDashboardToken, setDashboardToken } from '@/lib/api';

export function LoginGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('dashboard');
  const [token, setToken] = useState(getDashboardToken());
  const [draft, setDraft] = useState(token);

  if (!token) {
    return (
      <div className="shell" style={{ maxWidth: '32rem' }}>
        <section className="panel">
          <h1>{t('dashboard.loginTitle')}</h1>
          <p className="muted">{t('dashboard.loginIntro')}</p>
          <label className="muted" style={{ display: 'block', marginTop: '1rem' }}>
            {t('dashboard.tokenLabel')}
            <input
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              style={{ display: 'block', marginTop: '0.35rem' }}
            />
          </label>
          <button
            type="button"
            className="primary"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setDashboardToken(draft.trim());
              setToken(draft.trim());
            }}
          >
            {t('dashboard.loginAction')}
          </button>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
