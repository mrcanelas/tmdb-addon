import type { ReactNode } from 'react';

/**
 * Optional action row under the shell title.
 * Prefer `usePageHeader(title, subtitle)` to sync AppHeader — no layout node needed.
 */
export function PageActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-end gap-2">{children}</div>
  );
}
