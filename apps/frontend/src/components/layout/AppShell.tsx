import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollShadow } from '@metalayer/shared-ui';
import { AppHeader } from '@/components/layout/AppHeader';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ConfigureMobileNav } from '@/components/layout/ConfigureMobileNav';
import { ConfigureSidebar } from '@/components/layout/ConfigureSidebar';
import { DonateModal } from '@/components/layout/DonateModal';
import { PageTitleProvider } from '@/contexts/page-title';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Shell layout aligned with Avexado dashboard: floating sidebar + title header. */
export function AppShell() {
  const { t } = useTranslation();
  const donateOpen = useConfigureUiStore((s) => s.donateModalOpen);
  const setDonateOpen = useConfigureUiStore((s) => s.setDonateModalOpen);

  return (
    <PageTitleProvider displayName={t('shell.greeting.visitor')}>
      <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <a
          href="#page-main"
          className="absolute start-4 top-4 z-[100] -translate-y-[160%] rounded-md bg-[var(--surface-secondary)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-md outline-none ring-2 ring-transparent transition-transform focus:translate-y-0 focus:ring-[var(--accent)]"
        >
          {t('shell.skipToMain')}
        </a>

        <ConfigureSidebar />
        <ConfigureMobileNav />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main
            id="page-main"
            tabIndex={-1}
            aria-labelledby="page-title"
            className="flex min-h-0 flex-1 flex-col bg-[var(--background)]"
          >
            <ScrollShadow
              orientation="vertical"
              size={40}
              className="min-h-0 flex-1 px-4 pb-28 sm:px-10 sm:pb-4 md:pb-4"
            >
              <Outlet />
            </ScrollShadow>
          </main>
        </div>

        <CommandPalette />
        <DonateModal isOpen={donateOpen} onOpenChange={setDonateOpen} />
      </div>
    </PageTitleProvider>
  );
}
