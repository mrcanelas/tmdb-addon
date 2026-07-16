import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { ConfigureDashboardNav } from '@/components/layout/ConfigureDashboardNav';
import { cn } from '@/lib/utils';
import { useConfigureUiStore } from '@/stores/ui-store';

export function ConfigureSidebarContent({
  minimized,
  showCollapseToggle = false,
  onNavigate,
}: {
  minimized: boolean;
  showCollapseToggle?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const toggleSidebar = useConfigureUiStore((s) => s.toggleSidebar);
  const [status, setStatus] = useState(false);

  const handleToggle = () => {
    setStatus(true);
    toggleSidebar();
    window.setTimeout(() => setStatus(false), 500);
  };

  return (
    <>
      {showCollapseToggle ? (
        <ChevronLeft
          className={cn(
            'absolute -end-3 top-8 z-10 mt-12 size-6 cursor-pointer rounded-full bg-white p-0.5 text-black shadow-lg transition-transform duration-700 ease-in-out',
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
      ) : null}

      <div className="flex w-full shrink-0 items-center pt-6 pb-4">
        <Link
          to="/"
          aria-label={t('common.appName')}
          onClick={onNavigate}
          className="flex min-w-0 items-center text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)]"
        >
          <span className="flex w-[72px] shrink-0 items-center justify-center">
            <LogoMark className="size-9 text-white" />
          </span>
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap text-[22px] tracking-tight text-white transition-all duration-300 ease-in-out',
              minimized
                ? 'max-w-0 opacity-0'
                : 'max-w-[200px] opacity-100 pe-3',
            )}
            aria-hidden={minimized}
          >
            <span className="font-semibold">Meta</span>
            <span className="font-normal">Layer</span>
          </span>
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-1 px-0 pt-12 pb-2">
        <ConfigureDashboardNav
          forceExpanded={!minimized}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}
