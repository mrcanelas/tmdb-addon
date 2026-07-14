import { useEffect, type ReactNode } from 'react';
import { usePageTitle } from '@/contexts/page-title';

/**
 * Bridges page copy into the shell intelligent title (Avexado pattern).
 * The visible H1 lives in AppHeader — PageHeader only syncs context + actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  titleId = 'page-title',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleId?: string;
}) {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title, description);
  }, [title, description, setTitle]);

  return (
    <div className="mb-6 flex flex-wrap items-start justify-end gap-4">
      <h1 id={titleId} className="sr-only">
        {title}
      </h1>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
