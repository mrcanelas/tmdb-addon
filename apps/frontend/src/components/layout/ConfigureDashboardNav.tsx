import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIGURE_NAV, type ConfigureNavItem } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

function NavItemVisual({
  item,
  label,
  minimized,
  isActive,
}: {
  item: ConfigureNavItem;
  label: string;
  minimized: boolean;
  isActive: boolean;
}) {
  const Icon = item.Icon;
  return (
    <div
      data-active={isActive || undefined}
      className="group ms-3 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150"
    >
      <Icon className="h-6 w-6 shrink-0 text-white" aria-hidden />
      <span
        className={cn(
          'me-2 overflow-hidden truncate whitespace-nowrap text-white transition-all duration-300 ease-in-out',
          minimized ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100',
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Nav list + animated active rail — structure matches Avexado DashboardNav. */
export function ConfigureDashboardNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const minimized = useConfigureUiStore((s) => s.sidebarMinimized);
  const mode = useConfigureUiStore((s) => s.mode);
  const openDonateModal = useConfigureUiStore((s) => s.openDonateModal);
  const navRef = useRef<HTMLElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

  const { topItems, bottomItems } = useMemo(() => {
    const visible = CONFIGURE_NAV.filter(
      (item) => mode === 'advanced' || item.simpleMode,
    );
    return {
      topItems: visible.filter((item) => !item.pinnedBottom),
      bottomItems: visible.filter((item) => item.pinnedBottom),
    };
  }, [mode]);

  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;
      const activeItem = navRef.current.querySelector<HTMLElement>(
        '[data-active="true"]',
      );
      if (!activeItem) {
        setIndicatorStyle({ top: 0, height: 0 });
        return;
      }
      const activeRect = activeItem.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();
      const indicatorHeight = 24;
      requestAnimationFrame(() => {
        setIndicatorStyle({
          top:
            activeRect.top -
            navRect.top +
            activeRect.height / 2 -
            indicatorHeight / 2,
          height: indicatorHeight,
        });
      });
    };

    const timeoutId = window.setTimeout(updateIndicator, 0);
    window.addEventListener('resize', updateIndicator);
    const observer = new MutationObserver(updateIndicator);
    if (navRef.current) {
      observer.observe(navRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicator);
      observer.disconnect();
    };
  }, [location.pathname, minimized, topItems.length, bottomItems.length]);

  const renderItem = (item: ConfigureNavItem) => {
    const label = t(item.labelKey);

    if (item.kind === 'external' && item.href) {
      return (
        <div className="relative" key={item.id}>
          <a href={item.href} aria-label={label}>
            <NavItemVisual
              item={item}
              label={label}
              minimized={minimized}
              isActive={false}
            />
          </a>
        </div>
      );
    }

    if (item.kind === 'action' && item.action === 'donate') {
      return (
        <div className="relative" key={item.id}>
          <button
            type="button"
            aria-label={label}
            className="w-full appearance-none border-0 bg-transparent p-0 text-start"
            onClick={openDonateModal}
          >
            <NavItemVisual
              item={item}
              label={label}
              minimized={minimized}
              isActive={false}
            />
          </button>
        </div>
      );
    }

    if (item.kind !== 'route' || !item.path) return null;

    return (
      <div className="relative" key={item.id}>
        <NavLink to={item.path} end={item.path === '/'} aria-label={label}>
          {({ isActive }) => (
            <NavItemVisual
              item={item}
              label={label}
              minimized={minimized}
              isActive={isActive}
            />
          )}
        </NavLink>
      </div>
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label={t('nav.aria')}
      className="relative flex h-full flex-col justify-between"
    >
      <span
        aria-hidden
        className="absolute start-0 h-6 w-1 rounded-e bg-white transition-all duration-300 ease-in-out"
        style={{
          top: `${indicatorStyle.top}px`,
          opacity: indicatorStyle.height > 0 ? 1 : 0,
        }}
      />
      <div className="grid items-start gap-2">{topItems.map(renderItem)}</div>
      <div className="mb-2 grid items-start gap-2">
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  );
}
