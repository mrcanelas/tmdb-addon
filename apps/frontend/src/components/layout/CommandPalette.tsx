import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command } from 'cmdk';
import { Modal } from '@metalayer/shared-ui';
import { CONFIGURE_SEARCH_DESTINATIONS } from '@/navigation';
import { useConfigureUiStore } from '@/stores/ui-store';

/** Search modal (HeroUI Modal + cmdk) — jump to a configure destination. */
export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useConfigureUiStore((s) => s.commandPaletteOpen);
  const setOpen = useConfigureUiStore((s) => s.setCommandPaletteOpen);
  const mode = useConfigureUiStore((s) => s.mode);
  const toggleMode = useConfigureUiStore((s) => s.toggleMode);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useConfigureUiStore.getState().commandPaletteOpen);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  const destinations = useMemo(
    () =>
      CONFIGURE_SEARCH_DESTINATIONS.filter(
        (item) => mode === 'advanced' || item.simpleMode,
      ).map((item) => {
        const label = item.labelKeys.map((key) => t(key)).join(' → ');
        return { ...item, label };
      }),
    [mode, t],
  );

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={setOpen}
      variant="blur"
      isDismissable
    >
      <Modal.Container size="md" placement="top" className="pt-[10vh]">
        <Modal.Dialog aria-label={t('shell.searchModal.label')}>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t('shell.searchModal.label')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="p-0">
            <Command
              className="w-full outline-none"
              label={t('shell.searchModal.label')}
            >
              <div className="border-b border-[var(--ml-border)] px-3 py-2">
                <Command.Input
                  autoFocus
                  placeholder={t('shell.searchModal.placeholder')}
                  className="w-full bg-transparent text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-muted)]"
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-2 py-6 text-center text-sm text-muted">
                  {t('shell.searchModal.empty')}
                </Command.Empty>
                <Command.Group heading={t('shell.searchModal.group')}>
                  {destinations.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.id} ${item.label}`}
                      className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ml-text)] aria-selected:bg-[var(--ml-elevated)]"
                      onSelect={() => {
                        navigate(item.path);
                        setOpen(false);
                      }}
                    >
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading={t('shell.commandPalette.groupActions')}>
                  <Command.Item
                    value="toggle-mode"
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ml-text)] aria-selected:bg-[var(--ml-elevated)]"
                    onSelect={() => {
                      toggleMode();
                      setOpen(false);
                    }}
                  >
                    {t('shell.commandPalette.toggleMode')}
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
