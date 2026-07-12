import { Chip } from '@heroui/react';
import type { ReactNode } from 'react';

export type StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent';

const TONE_COLOR: Record<
  StatusTone,
  'default' | 'success' | 'warning' | 'danger' | 'accent'
> = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'accent',
  accent: 'accent',
};

export interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: StatusBadgeProps) {
  return (
    <Chip size="sm" variant="soft" color={TONE_COLOR[tone]} className={className}>
      <>{children}</>
    </Chip>
  );
}

/** Alias matching FRONTEND.md shared component name. */
export const Badge = StatusBadge;
