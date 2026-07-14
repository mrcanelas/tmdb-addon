import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface ModuleTab {
  to: string;
  label: string;
  end?: boolean;
}

/** Shared tab rail for Sources / Catalogs / Metas / Review hubs. */
export function ModuleTabs({ tabs }: { tabs: ModuleTab[] }) {
  const location = useLocation();

  return (
    <div
      role="tablist"
      className="mb-6 flex flex-wrap gap-1 border-b border-[var(--ml-border)] pb-px"
    >
      {tabs.map((tab) => {
        const active = tab.end
          ? location.pathname === tab.to ||
            location.pathname === `${tab.to}/`
          : location.pathname === tab.to ||
            location.pathname.startsWith(`${tab.to}/`);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            role="tab"
            aria-selected={active}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-[var(--ml-accent)] text-[var(--ml-text)]'
                : 'border-transparent text-[var(--ml-muted)] hover:text-[var(--ml-text)]',
            )}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export function ModuleHub({ tabs }: { tabs: ModuleTab[] }) {
  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
