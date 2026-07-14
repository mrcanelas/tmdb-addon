import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft } from 'react-icons/lu';
import { ConfigureDashboardNav } from '@/components/layout/ConfigureDashboardNav';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Floating accent sidebar — layout matches Avexado `Sidebar`. */
export function ConfigureSidebar() {
  const { t } = useTranslation();
  const minimized = useConfigureUiStore((s) => s.sidebarMinimized);
  const toggleSidebar = useConfigureUiStore((s) => s.toggleSidebar);
  const [status, setStatus] = useState(false);

  const handleToggle = () => {
    setStatus(true);
    toggleSidebar();
    window.setTimeout(() => setStatus(false), 500);
  };

  return (
    <div className="sm:my-5 sm:ms-5">
      <nav
        aria-label={t('shell.sidebar.aria')}
        className={cn(
          'relative hidden h-[calc(100vh-2.5rem)] rounded-2xl bg-[var(--ml-accent)] pt-20 md:block',
          status && 'duration-500',
          !minimized ? 'w-60' : 'w-[72px]',
        )}
      >
        <LuChevronLeft
          className={cn(
            'absolute -end-3 top-20 z-10 cursor-pointer rounded-full bg-white text-2xl text-black shadow-lg transition-transform duration-700 ease-in-out',
            minimized && 'rotate-180',
          )}
          aria-label={
            minimized
              ? t('shell.sidebar.expand')
              : t('shell.sidebar.collapse')
          }
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleToggle();
            }
          }}
        />
        <div className="h-full space-y-4 py-4">
          <div className="h-full py-2">
            <div className="mt-3 h-full space-y-1">
              <ConfigureDashboardNav />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
