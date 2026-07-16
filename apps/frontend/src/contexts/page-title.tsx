import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

interface PageTitleContextValue {
  title: string;
  subtitle?: string;
  setTitle: (title: string, subtitle?: string) => void;
  resetTitle: () => void;
}

const PageTitleContext = createContext<PageTitleContextValue | undefined>(
  undefined,
);

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function PageTitleProvider({
  children,
  displayName,
}: {
  children: ReactNode;
  /** Shown in the idle greeting — config name, user name, etc. */
  displayName?: string | null;
}) {
  const { t } = useTranslation();
  const [title, setTitleState] = useState('');
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined);
  const [isCustomTitle, setIsCustomTitle] = useState(false);

  const buildGreeting = useCallback(() => {
    const greeting = t(`shell.greeting.${greetingKey(new Date().getHours())}`);
    const name = displayName?.trim();
    if (name) {
      return t('shell.greeting.named', { greeting, name });
    }
    return t('shell.greeting.named', {
      greeting,
      name: t('shell.greeting.visitor'),
    });
  }, [displayName, t]);

  useEffect(() => {
    if (!isCustomTitle) {
      setTitleState(buildGreeting());
      setSubtitle(undefined);
    }
  }, [buildGreeting, isCustomTitle]);

  const setTitle = useCallback((newTitle: string, newSubtitle?: string) => {
    setTitleState(newTitle);
    setSubtitle(newSubtitle);
    setIsCustomTitle(true);
  }, []);

  const resetTitle = useCallback(() => {
    setIsCustomTitle(false);
  }, []);

  const value = useMemo(
    () => ({ title, subtitle, setTitle, resetTitle }),
    [title, subtitle, setTitle, resetTitle],
  );

  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error('usePageTitle must be used within PageTitleProvider');
  }
  return ctx;
}

/**
 * Syncs the shell AppHeader title (Avexado pattern).
 * Call from the page — no layout component required.
 */
export function usePageHeader(title: string, subtitle?: string) {
  const { setTitle, resetTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title, subtitle);
    return () => {
      resetTitle();
    };
  }, [title, subtitle, setTitle, resetTitle]);
}

/** Resets to the time-of-day greeting when the page mounts / unmounts. */
export function usePageTitleWithReset() {
  const ctx = usePageTitle();

  useEffect(() => {
    ctx.resetTitle();
    return () => {
      ctx.resetTitle();
    };
  }, [ctx]);

  return ctx;
}
