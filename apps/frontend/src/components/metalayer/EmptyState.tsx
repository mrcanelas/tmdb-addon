export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[var(--ml-radius)] border border-dashed border-[var(--ml-border)] px-4 py-10 text-center">
      <p className="font-medium text-[var(--ml-text)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm ml-text-muted">{description}</p>
      ) : null}
    </div>
  );
}
