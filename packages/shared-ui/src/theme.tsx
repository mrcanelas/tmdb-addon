import { useEffect, type ReactNode } from 'react';

export type MetaLayerTheme = 'dark' | 'light';

export interface MetaLayerThemeProviderProps {
  theme?: MetaLayerTheme;
  children: ReactNode;
}

/** Applies `data-theme` for Layered Minimalism CSS tokens. */
export function MetaLayerThemeProvider({
  theme = 'dark',
  children,
}: MetaLayerThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return children;
}
