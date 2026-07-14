import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { CONFIGURE_NAV } from '@/navigation';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

function NavIconLink({
  to,
  end,
  label,
  Icon,
}: {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconType;
}) {
  return (
    <div className="group relative flex justify-center">
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        title={label}
        className={({ isActive }) =>
          cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
            isActive
              ? 'bg-[var(--ml-accent-soft)] text-[var(--ml-accent)]'
              : 'text-[var(--ml-muted)] hover:bg-[var(--ml-elevated)] hover:text-[var(--ml-text)]',
          )
        }
      >
        <Icon className="h-5 w-5" aria-hidden />
      </NavLink>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute start-full top-1/2 z-50 ms-2 -translate-y-1/2',
          'whitespace-nowrap rounded-md border border-[var(--ml-border)] bg-[var(--ml-elevated)]',
          'px-2 py-1 text-xs font-medium text-[var(--ml-text)] shadow-lg',
          'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ConfigureSidebar() {
  const { t } = useTranslation();
  const mode = useConfigureUiStore((s) => s.mode);

  const { primary, pinned } = useMemo(() => {
    const visible = CONFIGURE_NAV.filter(
      (item) => mode === 'advanced' || item.simpleMode,
    );
    return {
      primary: visible.filter((item) => !item.pinnedBottom),
      pinned: visible.filter((item) => item.pinnedBottom),
    };
  }, [mode]);

  return (
    <aside
      className="flex h-dvh w-[4.5rem] shrink-0 flex-col items-center border-e border-[var(--ml-border)] bg-[var(--ml-surface)] py-3"
      aria-label={t('shell.sidebar.aria')}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ml-elevated)]"
        title={t('common.appName')}
        aria-hidden
      >
        <span className="h-4 w-4 rounded-sm bg-gradient-to-br from-[var(--ml-accent)] to-indigo-600" />
      </div>

      <nav
        aria-label={t('nav.aria')}
        className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1"
      >
        {primary.map((item) => (
          <NavIconLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            label={t(item.labelKey)}
            Icon={item.Icon}
          />
        ))}
      </nav>

      {pinned.length > 0 ? (
        <div className="mt-2 flex flex-col items-center gap-1 border-t border-[var(--ml-border)] pt-2">
          {pinned.map((item) => (
            <NavIconLink
              key={item.id}
              to={item.path}
              label={t(item.labelKey)}
              Icon={item.Icon}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-2 px-1 text-center text-[0.65rem] leading-tight text-[var(--ml-muted)]">
        {t('shell.sidebar.version')}
      </p>
    </aside>
  );
}
