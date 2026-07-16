import { Button } from '@metalayer/shared-ui';

export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="ml-surface border-[color-mix(in_srgb,var(--warning)_35%,var(--border))] p-4"
      role="alert"
    >
      <p className="text-sm text-[var(--warning)]">{message}</p>
      {onRetry && retryLabel ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onPress={onRetry}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
