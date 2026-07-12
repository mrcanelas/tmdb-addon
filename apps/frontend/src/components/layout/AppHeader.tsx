import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import { useConfigureUiStore } from '@/stores/ui-store';

export function AppHeader() {
  const { t } = useTranslation();
  const mode = useConfigureUiStore((s) => s.mode);
  const setMode = useConfigureUiStore((s) => s.setMode);
  const theme = useConfigureUiStore((s) => s.theme);
  const toggleTheme = useConfigureUiStore((s) => s.toggleTheme);
  const openCommandPalette = useConfigureUiStore((s) => s.openCommandPalette);

  return (
    <header className="ml-glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--ml-radius)] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--ml-text)]">
          {t('shell.configNameDefault')}
        </p>
        <p className="text-xs ml-text-muted">{t('shell.unsavedIdle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-md border border-[var(--ml-border)] p-0.5"
          role="group"
          aria-label={t('shell.mode.aria')}
        >
          <Button
            type="button"
            size="sm"
            variant={mode === 'simple' ? 'primary' : 'quiet'}
            aria-pressed={mode === 'simple'}
            onPress={() => setMode('simple')}
          >
            {t('shell.mode.simple')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'advanced' ? 'primary' : 'quiet'}
            aria-pressed={mode === 'advanced'}
            onPress={() => setMode('advanced')}
          >
            {t('shell.mode.advanced')}
          </Button>
        </div>

        <Button type="button" size="sm" variant="outline" onPress={openCommandPalette}>
          {t('shell.commandPalette.trigger')}
        </Button>

        <Button type="button" size="sm" variant="outline" onPress={toggleTheme}>
          {theme === 'dark' ? t('shell.theme.light') : t('shell.theme.dark')}
        </Button>
      </div>
    </header>
  );
}
