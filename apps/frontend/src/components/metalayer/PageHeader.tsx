import type { ReactNode } from 'react';

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
  const descriptionId = description ? `${titleId}-description` : undefined;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl space-y-2">
        <h1
          id={titleId}
          className="text-3xl font-semibold tracking-tight text-[var(--ml-text)]"
          aria-describedby={descriptionId}
        >
          {title}
        </h1>
        {description ? (
          <p id={descriptionId} className="ml-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
