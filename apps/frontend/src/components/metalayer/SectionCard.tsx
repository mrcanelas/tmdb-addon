import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('ml-surface p-5', className)}>
      {title || description ? (
        <div className="mb-4 space-y-1">
          {title ? (
            <h2 className="text-lg font-medium text-[var(--foreground)]">{title}</h2>
          ) : null}
          {description ? (
            <p className="text-sm ml-text-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
