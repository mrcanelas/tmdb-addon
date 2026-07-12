/**
 * Compatibility re-export — prefer `@metalayer/shared-ui` for new code.
 * Maps legacy shadcn-style variants onto MetaLayer HeroUI wrappers.
 */
import {
  Button as MetaButton,
  type ButtonProps as MetaButtonProps,
  type MetaLayerButtonVariant,
} from '@metalayer/shared-ui';
import type { ReactNode } from 'react';

type LegacyVariant = 'default' | 'secondary' | 'outline' | 'ghost' | MetaLayerButtonVariant;
type LegacySize = 'default' | 'sm' | 'lg' | 'md';

export interface ButtonProps {
  variant?: LegacyVariant;
  size?: LegacySize;
  children?: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  onPress?: MetaButtonProps['onPress'];
  /** Ignored — use Link + Button separately; kept for compile compatibility. */
  asChild?: boolean;
}

function mapVariant(variant: LegacyVariant | undefined): MetaLayerButtonVariant {
  switch (variant) {
    case 'default':
    case undefined:
      return 'primary';
    case 'ghost':
      return 'quiet';
    case 'secondary':
    case 'outline':
    case 'primary':
    case 'destructive':
    case 'quiet':
      return variant;
    default:
      return 'primary';
  }
}

function mapSize(size: LegacySize | undefined): MetaButtonProps['size'] {
  if (size === 'sm') return 'sm';
  if (size === 'lg') return 'lg';
  return 'md';
}

export function Button({
  variant,
  size,
  children,
  onClick,
  onPress,
  disabled,
  isDisabled,
  asChild: _asChild,
  ...rest
}: ButtonProps) {
  void _asChild;
  return (
    <MetaButton
      variant={mapVariant(variant)}
      size={mapSize(size)}
      isDisabled={isDisabled ?? disabled}
      onPress={onPress ?? (onClick ? () => onClick() : undefined)}
      {...rest}
    >
      {children}
    </MetaButton>
  );
}
