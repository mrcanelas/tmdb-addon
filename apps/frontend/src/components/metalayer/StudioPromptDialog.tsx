import { useEffect, useId, useRef } from 'react';
import { Button, Input, Modal } from '@metalayer/shared-ui';

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

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      variant="blur"
      isDismissable
    >
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog aria-labelledby={titleId}>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading id={titleId}>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <label className="grid gap-1 text-sm text-[var(--foreground)]">
              <span>{label}</span>
              <Input
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
              />
            </label>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline" onPress={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
