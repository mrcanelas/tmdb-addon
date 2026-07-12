import { StatusBadge, type StatusTone } from '@metalayer/shared-ui';
import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'muted';
}

function toneFromVariant(variant: BadgeProps['variant']): StatusTone {
  if (variant === 'destructive') return 'error';
  if (variant === 'muted' || variant === 'secondary' || variant === 'outline') {
    return 'neutral';
  }
  return 'accent';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <StatusBadge tone={toneFromVariant(variant)} className={className}>
      {children}
    </StatusBadge>
  );
}
