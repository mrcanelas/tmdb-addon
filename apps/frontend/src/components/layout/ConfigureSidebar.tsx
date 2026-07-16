import { useTranslation } from 'react-i18next';
import { ConfigureSidebarContent } from '@/components/layout/ConfigureSidebarContent';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Floating accent sidebar — layout matches Avexado `Sidebar`. */
export function ConfigureSidebar() {
  const { t } = useTranslation();
  const minimized = useConfigureUiStore((s) => s.sidebarMinimized);

  return (
    <div className="sm:my-5 sm:ms-5">
      <nav
        aria-label={t('shell.sidebar.aria')}
        className={cn(
          'relative hidden h-[calc(100vh-2.5rem)] flex-col rounded-2xl bg-[var(--accent)] transition-[width] duration-300 ease-in-out md:flex',
          !minimized ? 'w-60' : 'w-[72px]',
        )}
      >
        <ConfigureSidebarContent minimized={minimized} showCollapseToggle />
      </nav>
    </div>
  );
}
