import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIGURE_NAV } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Floating bottom icon bar — matches Avexado MobileBottomBar. */
export function ConfigureMobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const mode = useConfigureUiStore((s) => s.mode);
  const [hidden, setHidden] = useState(false);

  const items = useMemo(
    () =>
      CONFIGURE_NAV.filter(
        (item) => mode === 'advanced' || item.simpleMode,
      ),
    [mode],
  );

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;
    let lastScroll = container.scrollTop;
    const onScroll = () => {
      setHidden(container.scrollTop > lastScroll);
      lastScroll = container.scrollTop;
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  return (
    <nav
      aria-label={t('nav.aria')}
      className={cn(
        'fixed inset-x-4 bottom-4 z-50 transition-all duration-500 md:hidden',
        hidden
          ? 'pointer-events-none translate-y-32 opacity-0'
          : 'pointer-events-auto translate-y-0 opacity-100',
      )}
    >
      <div
        className="scrollbar-hide flex justify-start gap-6 overflow-x-auto rounded-2xl bg-[var(--ml-accent)] px-5 py-6 shadow-lg"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              aria-label={t(item.labelKey)}
              className="relative flex flex-col items-center justify-center rounded-xl text-white"
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="pointer-events-none absolute -bottom-4 start-1/2 h-1 w-6 -translate-x-1/2 rounded-t bg-white" />
                  ) : null}
                  <Icon className="h-7 w-7" aria-hidden />
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
