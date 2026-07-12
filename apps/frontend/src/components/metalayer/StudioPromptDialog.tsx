import { useEffect, useId, useRef } from 'react';
import { Button } from '@metalayer/shared-ui';

export interface StudioPromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}

export function StudioPromptDialog({
  open,
  title,
  label,
  value,
  onChange,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: StudioPromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ml-glass w-full max-w-md rounded-[var(--ml-radius)] p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-[var(--ml-text)]"
        >
          {title}
        </h2>
        <label className="mt-4 grid gap-1 text-sm text-[var(--ml-text)]">
          <span>{label}</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onConfirm();
              }
            }}
            className="h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]"
          />
        </label>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onPress={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
