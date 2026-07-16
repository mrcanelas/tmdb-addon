import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@metalayer/shared-ui';
import { ConfigureSidebarContent } from '@/components/layout/ConfigureSidebarContent';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Left drawer navigation on mobile — expanded sidebar content with logo. */
export function ConfigureMobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const open = useConfigureUiStore((s) => s.mobileNavOpen);
  const setOpen = useConfigureUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  return (
    <Drawer isOpen={open} onOpenChange={setOpen}>
      <Drawer.Backdrop isDismissable variant="blur" className="md:hidden">
        <Drawer.Content
          placement="left"
          className="md:hidden w-[min(100vw-2rem,15rem)] max-w-[15rem] border-0 bg-transparent p-0 shadow-none"
        >
          <Drawer.Dialog
            id="configure-mobile-nav"
            aria-label={t('shell.sidebar.aria')}
            className="flex h-dvh flex-col rounded-none border-0 bg-[var(--accent)] p-0 shadow-xl outline-none"
          >
            <Drawer.CloseTrigger className="absolute end-3 top-3 z-10 text-white" />
            <Drawer.Body className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-0">
              <ConfigureSidebarContent
                minimized={false}
                onNavigate={() => setOpen(false)}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
