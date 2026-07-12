import { NavLink, Route, Routes, BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OverviewPage } from './pages/OverviewPage';
import { LogsPage } from './pages/LogsPage';
import { BackupsPage } from './pages/BackupsPage';
import { UpdatesPage } from './pages/UpdatesPage';
import { LoginGate } from './components/LoginGate';

export function App() {
  const { t, i18n } = useTranslation('dashboard');

  return (
    <BrowserRouter>
      <LoginGate>
        <div className="shell">
          <aside>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {t('dashboard.appName')}
            </p>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              {t('dashboard.tagline')}
            </p>
            <nav aria-label={t('dashboard.navAria')} style={{ marginTop: '1.25rem' }}>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {t('dashboard.nav.overview')}
              </NavLink>
              <NavLink to="/logs" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {t('dashboard.nav.logs')}
              </NavLink>
              <NavLink to="/backups" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {t('dashboard.nav.backups')}
              </NavLink>
              <NavLink to="/updates" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {t('dashboard.nav.updates')}
              </NavLink>
            </nav>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(['en-US', 'pt-BR', 'es-ES'] as const).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  className={i18n.language === locale ? 'primary' : undefined}
                  onClick={() => {
                    void i18n.changeLanguage(locale);
                    document.documentElement.lang = locale;
                  }}
                >
                  {locale}
                </button>
              ))}
            </div>
          </aside>
          <main>
            <Routes>
              <Route index element={<OverviewPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="backups" element={<BackupsPage />} />
              <Route path="updates" element={<UpdatesPage />} />
            </Routes>
          </main>
        </div>
      </LoginGate>
    </BrowserRouter>
  );
}
