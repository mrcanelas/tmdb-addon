import { Button as HeroButton } from '@heroui/react';
import type { ComponentProps } from 'react';

type HeroButtonProps = ComponentProps<typeof HeroButton>;

export type MetaLayerButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'quiet'
  | 'outline';

export interface ButtonProps {
  variant?: MetaLayerButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  children?: HeroButtonProps['children'];
  className?: string;
  isDisabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onPress?: HeroButtonProps['onPress'];
  fullWidth?: boolean;
  isIconOnly?: boolean;
}

const VARIANT_MAP: Record<MetaLayerButtonVariant, HeroButtonProps['variant']> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'danger',
  quiet: 'ghost',
  outline: 'outline',
};

/**
 * MetaLayer branded button over HeroUI v3.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  isDisabled,
  type = 'button',
  onPress,
  fullWidth,
  isIconOnly,
}: ButtonProps) {
  return (
    <HeroButton
      type={type}
      size={size}
      variant={VARIANT_MAP[variant]}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      fullWidth={fullWidth}
      isIconOnly={isIconOnly}
    >
      {children}
    </HeroButton>
  );
}
