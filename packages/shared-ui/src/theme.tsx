import { useEffect, type ReactNode } from 'react';

export type MetaLayerTheme = 'dark' | 'light';

export interface MetaLayerThemeProviderProps {
  theme?: MetaLayerTheme;
  children: ReactNode;
}

/** Applies HeroUI theme selectors (`data-theme` + `.dark` / `.light`). */
export function MetaLayerThemeProvider({
  theme = 'dark',
  children,
}: MetaLayerThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }, [theme]);

  return children;
}
