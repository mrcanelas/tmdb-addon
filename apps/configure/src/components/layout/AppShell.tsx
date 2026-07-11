import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIGURE_NAV } from '@/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { t, i18n } = useTranslation();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-8 md:py-10">
      <aside className="md:w-60 md:shrink-0">
        <div className="mb-6">
          <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t('common.appName')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('common.tagline')}</p>
        </div>

        <nav aria-label={t('nav.aria')} className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {CONFIGURE_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
              variant={i18n.language === locale ? 'default' : 'outline'}
              onClick={() => {
                void i18n.changeLanguage(locale);
                document.documentElement.lang = locale;
              }}
            >
              {locale}
            </Button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
