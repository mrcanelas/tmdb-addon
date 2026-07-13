import { NavLink, Route, Routes, BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applyDocumentLocale, LOCALE_REGISTRY } from '@metalayer/i18n';
import { Button, MetaLayerThemeProvider } from '@metalayer/shared-ui';
import { OverviewPage } from './pages/OverviewPage';
import { LogsPage } from './pages/LogsPage';
import { BackupsPage } from './pages/BackupsPage';
import { UpdatesPage } from './pages/UpdatesPage';
import { LoginGate } from './components/LoginGate';

const SHELL_LOCALES = LOCALE_REGISTRY.filter(
  (locale) => locale.status === 'stable' || locale.status === 'pseudo',
);

export function App() {
  const { t, i18n } = useTranslation('dashboard');

  return (
    <MetaLayerThemeProvider theme="dark">
      <BrowserRouter basename="/admin">
        <LoginGate>
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[14rem_1fr] md:px-6 md:py-10">
            <a
              href="#page-main"
              className="absolute start-4 top-4 z-[100] -translate-y-[160%] rounded-md bg-[var(--ml-elevated)] px-3 py-2 text-sm font-medium text-[var(--ml-text)] shadow-md outline-none ring-2 ring-transparent transition-transform focus:translate-y-0 focus:ring-[var(--ml-accent)]"
            >
              {t('dashboard.skipToMain')}
            </a>
            <aside className="ml-glass rounded-[var(--ml-radius)] p-4">
              <p className="m-0 text-2xl font-bold text-[var(--ml-text)]">
                {t('dashboard.appName')}
              </p>
              <p className="ml-text-muted mt-1 text-sm">{t('dashboard.tagline')}</p>
              <nav
                aria-label={t('dashboard.navAria')}
                className="mt-5 flex flex-wrap gap-2 md:flex-col"
              >
                <NavLink to="/" end className={({ isActive }) => (isActive ? 'font-semibold text-[var(--ml-accent)]' : 'ml-text-muted')}>
                  {t('dashboard.nav.overview')}
                </NavLink>
                <NavLink to="/logs" className={({ isActive }) => (isActive ? 'font-semibold text-[var(--ml-accent)]' : 'ml-text-muted')}>
                  {t('dashboard.nav.logs')}
                </NavLink>
                <NavLink to="/backups" className={({ isActive }) => (isActive ? 'font-semibold text-[var(--ml-accent)]' : 'ml-text-muted')}>
                  {t('dashboard.nav.backups')}
                </NavLink>
                <NavLink to="/updates" className={({ isActive }) => (isActive ? 'font-semibold text-[var(--ml-accent)]' : 'ml-text-muted')}>
                  {t('dashboard.nav.updates')}
                </NavLink>
              </nav>
              <div className="mt-4 flex flex-wrap gap-2">
                {SHELL_LOCALES.map((locale) => (
                  <Button
                    key={locale.id}
                    size="sm"
                    variant={i18n.language === locale.id ? 'primary' : 'outline'}
                    aria-label={
                      locale.status === 'pseudo'
                        ? t('dashboard.locale.pseudoQa', { locale: locale.id })
                        : locale.id
                    }
                    aria-pressed={i18n.language === locale.id}
                    onPress={() => {
                      void i18n.changeLanguage(locale.id).then(() => {
                        applyDocumentLocale(locale.id);
                      });
                    }}
                  >
                    {locale.status === 'pseudo'
                      ? t('dashboard.locale.pseudoQa', { locale: locale.id })
                      : locale.id}
                  </Button>
                ))}
              </div>
            </aside>
            <main id="page-main" tabIndex={-1}>
              <Routes>
                <Route index element={<OverviewPage />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="backups" element={<BackupsPage />} />
                <Route path="updates" element={<UpdatesPage />} />
              </Routes>
            </main>
          </div>
        </LoginGate>
      </BrowserRouter>
    </MetaLayerThemeProvider>
  );
}
