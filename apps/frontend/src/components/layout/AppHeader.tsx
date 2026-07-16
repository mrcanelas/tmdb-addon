import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Languages,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react';
import { Button, Toolbar } from '@metalayer/shared-ui';
import { LanguageModal } from '@/components/layout/LanguageModal';
import { usePageTitle } from '@/contexts/page-title';
import { getAdjacentHubPath } from '@/navigation';
import { useConfigureUiStore } from '@/stores/ui-store';

const CIRCLE_ICON_CLASS = 'rounded-full p-2 border-none hover:bg-black/10';

/** Header: intelligent title + HeroUI circular Language / Search / Theme / Prev / Next. */
export function AppHeader() {
  const { t } = useTranslation();
  const { title, subtitle } = usePageTitle();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useConfigureUiStore((s) => s.theme);
  const toggleTheme = useConfigureUiStore((s) => s.toggleTheme);
  const openCommandPalette = useConfigureUiStore((s) => s.openCommandPalette);
  const openMobileNav = useConfigureUiStore((s) => s.openMobileNav);
  const mobileNavOpen = useConfigureUiStore((s) => s.mobileNavOpen);
  const mode = useConfigureUiStore((s) => s.mode);
  const [languageOpen, setLanguageOpen] = useState(false);

  const prevPath = getAdjacentHubPath(location.pathname, mode, -1);
  const nextPath = getAdjacentHubPath(location.pathname, mode, 1);

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-6 lg:ps-10 lg:pe-14">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={`${CIRCLE_ICON_CLASS} md:hidden`}
            aria-label={t('shell.header.menu')}
            aria-expanded={mobileNavOpen}
            aria-controls="configure-mobile-nav"
            onPress={openMobileNav}
          >
            <Menu className="size-5" aria-hidden />
          </Button>

          <div className="min-w-0 flex-1">
            <h1
              id="page-title"
              className="hidden truncate text-3xl font-bold text-[var(--foreground)] lg:block"
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 hidden truncate text-[var(--muted)] lg:block">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <Toolbar
          aria-label={t('shell.header.aria')}
          className="flex shrink-0 items-center gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={CIRCLE_ICON_CLASS}
            aria-label={t('shell.header.language')}
            aria-haspopup="dialog"
            aria-expanded={languageOpen}
            onPress={() => setLanguageOpen(true)}
          >
            <Languages className="size-5" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={CIRCLE_ICON_CLASS}
            aria-label={t('shell.header.search')}
            aria-haspopup="dialog"
            onPress={openCommandPalette}
          >
            <Search className="size-5" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={CIRCLE_ICON_CLASS}
            aria-label={
              theme === 'dark' ? t('shell.theme.light') : t('shell.theme.dark')
            }
            onPress={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="size-5" aria-hidden />
            ) : (
              <Moon className="size-5" aria-hidden />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={CIRCLE_ICON_CLASS}
            aria-label={t('shell.header.prev')}
            isDisabled={!prevPath}
            onPress={() => {
              if (prevPath) navigate(prevPath);
            }}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            isIconOnly
            className={CIRCLE_ICON_CLASS}
            aria-label={t('shell.header.next')}
            isDisabled={!nextPath}
            onPress={() => {
              if (nextPath) navigate(nextPath);
            }}
          >
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        </Toolbar>
      </div>

      <LanguageModal isOpen={languageOpen} onOpenChange={setLanguageOpen} />
    </>
  );
}
