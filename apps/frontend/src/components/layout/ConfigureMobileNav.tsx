import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIGURE_NAV, type ConfigureNavItem } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

function MobileIcon({
  item,
  label,
  isActive,
  onActivate,
}: {
  item: ConfigureNavItem;
  label: string;
  isActive: boolean;
  onActivate?: () => void;
}) {
  const Icon = item.Icon;
  const content = (
    <>
      {isActive ? (
        <span className="pointer-events-none absolute -bottom-4 start-1/2 h-1 w-6 -translate-x-1/2 rounded-t bg-white" />
      ) : null}
      <Icon className="h-7 w-7" aria-hidden />
    </>
  );

  if (item.kind === 'external' && item.href) {
    return (
      <a
        href={item.href}
        aria-label={label}
        className="relative flex flex-col items-center justify-center rounded-xl text-white"
      >
        {content}
      </a>
    );
  }

  if (item.kind === 'action' && item.action === 'donate') {
    return (
      <button
        type="button"
        aria-label={label}
        className="relative flex flex-col items-center justify-center rounded-xl border-0 bg-transparent p-0 text-white"
        onClick={onActivate}
      >
        {content}
      </button>
    );
  }

  if (item.kind !== 'route' || !item.path) return null;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      aria-label={label}
      className="relative flex flex-col items-center justify-center rounded-xl text-white"
    >
      {({ isActive: active }) => (
        <>
          {active ? (
            <span className="pointer-events-none absolute -bottom-4 start-1/2 h-1 w-6 -translate-x-1/2 rounded-t bg-white" />
          ) : null}
          <Icon className="h-7 w-7" aria-hidden />
        </>
      )}
    </NavLink>
  );
}

/** Floating bottom icon bar — matches Avexado MobileBottomBar. */
export function ConfigureMobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const mode = useConfigureUiStore((s) => s.mode);
  const openDonateModal = useConfigureUiStore((s) => s.openDonateModal);
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
        className="scrollbar-hide flex justify-start gap-6 overflow-x-auto rounded-2xl bg-[var(--accent)] px-5 py-6 shadow-lg"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <MobileIcon
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            isActive={false}
            onActivate={
              item.action === 'donate' ? openDonateModal : undefined
            }
          />
        ))}
      </div>
    </nav>
  );
}
