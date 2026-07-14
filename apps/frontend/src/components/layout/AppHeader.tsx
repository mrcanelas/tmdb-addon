import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import { applyDocumentLocale, LOCALE_REGISTRY } from '@metalayer/i18n';
import { usePageTitle } from '@/contexts/page-title';
import { useConfigureUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const SHELL_LOCALES = LOCALE_REGISTRY.filter(
  (locale) => locale.status === 'stable' || locale.status === 'pseudo',
);

/** Header pattern from Avexado: large intelligent title + right-side chrome. */
export function AppHeader() {
  const { t, i18n } = useTranslation();
  const { title, subtitle } = usePageTitle();
  const mode = useConfigureUiStore((s) => s.mode);
  const setMode = useConfigureUiStore((s) => s.setMode);
  const theme = useConfigureUiStore((s) => s.theme);
  const toggleTheme = useConfigureUiStore((s) => s.toggleTheme);
  const openCommandPalette = useConfigureUiStore((s) => s.openCommandPalette);

  return (
    <div className="flex items-center justify-between p-6 lg:ps-10 lg:pe-14">
      <div className="flex min-w-0 flex-col">
        <h1
          id="page-title"
          className="hidden truncate text-3xl font-bold text-[var(--ml-text)] lg:block"
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 hidden text-[var(--ml-muted)] lg:block">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className={cn('block lg:hidden')} />

      <div className="flex flex-wrap items-center gap-3">
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

        <div
          className="hidden flex-wrap gap-1 sm:flex"
          role="group"
          aria-label={t('shell.locale.aria')}
        >
          {SHELL_LOCALES.filter((locale) => locale.status === 'stable').map(
            (locale) => (
              <Button
                key={locale.id}
                type="button"
                size="sm"
                variant={i18n.language === locale.id ? 'primary' : 'outline'}
                aria-label={t('shell.locale.switch', {
                  locale: locale.displayName,
                })}
                aria-pressed={i18n.language === locale.id}
                onPress={() => {
                  void i18n.changeLanguage(locale.id);
                  applyDocumentLocale(locale.id);
                }}
              >
                {locale.id}
              </Button>
            ),
          )}
        </div>

        <Button type="button" size="sm" variant="outline" onPress={toggleTheme}>
          {theme === 'dark' ? t('shell.theme.light') : t('shell.theme.dark')}
        </Button>
      </div>
    </div>
  );
}
