import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Button } from '@metalayer/shared-ui';
import { applyDocumentLocale, LOCALE_REGISTRY } from '@metalayer/i18n';
import { CONFIGURE_NAV } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';
import { AppHeader } from '@/components/layout/AppHeader';
import { CommandPalette } from '@/components/layout/CommandPalette';

const SHELL_LOCALES = LOCALE_REGISTRY.filter(
  (locale) => locale.status === 'stable' || locale.status === 'pseudo',
);

export function AppShell() {
  const { t, i18n } = useTranslation();
  const mode = useConfigureUiStore((s) => s.mode);

  const navItems = useMemo(
    () => CONFIGURE_NAV.filter((item) => mode === 'advanced' || item.simpleMode),
    [mode],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-8 md:py-10">
      <aside
        className="ml-glass md:w-[260px] md:shrink-0 rounded-[var(--ml-radius)] p-4"
        aria-label={t('shell.sidebar.aria')}
      >
        <div className="mb-6">
          <p className="text-2xl font-semibold tracking-tight text-[var(--ml-text)]">
            {t('common.appName')}
          </p>
          <p className="mt-1 text-sm ml-text-muted">{t('common.tagline')}</p>
        </div>

        <nav
          aria-label={t('nav.aria')}
          className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--ml-elevated)] font-medium text-[var(--ml-text)]'
                    : 'ml-text-muted hover:bg-[var(--ml-elevated)] hover:text-[var(--ml-text)]',
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div
          className="mt-6 flex flex-wrap gap-2"
          role="group"
          aria-label={t('shell.locale.aria')}
        >
          {SHELL_LOCALES.map((locale) => (
            <Button
              key={locale.id}
              type="button"
              size="sm"
              variant={i18n.language === locale.id ? 'primary' : 'outline'}
              aria-label={t('shell.locale.switch', {
                locale: locale.displayName,
              })}
              aria-pressed={i18n.language === locale.id}
              onPress={() => {
                void i18n.changeLanguage(locale.id);
                applyDocumentLocale(locale.id);
              }}
            >
              {locale.id}
            </Button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <AppHeader />
        <main aria-labelledby="page-title">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
