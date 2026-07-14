import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/layout/AppHeader';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ConfigureSidebar } from '@/components/layout/ConfigureSidebar';

export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh w-full bg-[var(--ml-bg)] text-[var(--ml-text)]">
      <a
        href="#page-main"
        className="absolute start-4 top-4 z-[100] -translate-y-[160%] rounded-md bg-[var(--ml-elevated)] px-3 py-2 text-sm font-medium text-[var(--ml-text)] shadow-md outline-none ring-2 ring-transparent transition-transform focus:translate-y-0 focus:ring-[var(--ml-accent)]"
      >
        {t('shell.skipToMain')}
      </a>

      <ConfigureSidebar />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="page-main"
          tabIndex={-1}
          aria-labelledby="page-title"
          className="min-h-0 flex-1 overflow-auto px-4 py-6 md:px-8"
        >
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
