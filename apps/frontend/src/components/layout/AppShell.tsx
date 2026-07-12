import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Button } from '@metalayer/shared-ui';
import { CONFIGURE_NAV } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';
import { AppHeader } from '@/components/layout/AppHeader';
import { CommandPalette } from '@/components/layout/CommandPalette';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const mode = useConfigureUiStore((s) => s.mode);

  const navItems = useMemo(
    () => CONFIGURE_NAV.filter((item) => mode === 'advanced' || item.simpleMode),
    [mode],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-8 md:py-10">
      <aside className="ml-glass md:w-[260px] md:shrink-0 rounded-[var(--ml-radius)] p-4">
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

        <div className="mt-6 flex flex-wrap gap-2">
          {(['en-US', 'pt-BR', 'es-ES'] as const).map((locale) => (
            <Button
              key={locale}
              type="button"
              size="sm"
              variant={i18n.language === locale ? 'primary' : 'outline'}
              onPress={() => {
                void i18n.changeLanguage(locale);
                document.documentElement.lang = locale;
              }}
            >
              {locale}
            </Button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <AppHeader />
        <main>
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
