import { Spinner } from '@metalayer/shared-ui';

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 text-sm ml-text-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}
