import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command } from 'cmdk';
import { CONFIGURE_NAV } from '@/navigation';
import { useConfigureUiStore } from '@/stores/ui-store';

export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const open = useConfigureUiStore((s) => s.commandPaletteOpen);
  const setOpen = useConfigureUiStore((s) => s.setCommandPaletteOpen);
  const mode = useConfigureUiStore((s) => s.mode);
  const toggleMode = useConfigureUiStore((s) => s.toggleMode);
  const toggleTheme = useConfigureUiStore((s) => s.toggleTheme);

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

  const navItems = useMemo(
    () =>
      CONFIGURE_NAV.filter((item) => mode === 'advanced' || item.simpleMode),
    [mode],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh]"
      role="presentation"
      onMouseDown={() => setOpen(false)}
    >
      <Command
        className="ml-glass w-full max-w-lg overflow-hidden rounded-[var(--ml-radius)] shadow-xl"
        label={t('shell.commandPalette.label')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--ml-border)] px-3 py-2">
          <Command.Input
            autoFocus
            placeholder={t('shell.commandPalette.placeholder')}
            className="w-full bg-transparent text-[var(--ml-text)] outline-none placeholder:text-[var(--ml-muted)]"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-sm ml-text-muted">
            {t('shell.commandPalette.empty')}
          </Command.Empty>

          <Command.Group heading={t('shell.commandPalette.groupNavigate')}>
            {navItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.id} ${t(item.labelKey)}`}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ml-text)] aria-selected:bg-[var(--ml-elevated)]"
                onSelect={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
              >
                {t(item.labelKey)}
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
            <Command.Item
              value="toggle-theme"
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ml-text)] aria-selected:bg-[var(--ml-elevated)]"
              onSelect={() => {
                toggleTheme();
                setOpen(false);
              }}
            >
              {t('shell.commandPalette.toggleTheme')}
            </Command.Item>
            {(['en-US', 'pt-BR', 'es-ES'] as const).map((locale) => (
              <Command.Item
                key={locale}
                value={`locale-${locale}`}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ml-text)] aria-selected:bg-[var(--ml-elevated)]"
                onSelect={() => {
                  void i18n.changeLanguage(locale);
                  document.documentElement.lang = locale;
                  setOpen(false);
                }}
              >
                {t('shell.commandPalette.switchLocale', { locale })}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
