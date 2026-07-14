import { Button as HeroButton } from '@heroui/react';
import type { ComponentProps } from 'react';

type HeroButtonProps = ComponentProps<typeof HeroButton>;

export type MetaLayerButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'quiet'
  | 'outline';

type ForwardedAriaProps = Pick<
  HeroButtonProps,
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-pressed'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-haspopup'
  | 'aria-current'
  | 'id'
  | 'slot'
>;

export interface ButtonProps extends ForwardedAriaProps {
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
  id,
  slot,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  'aria-haspopup': ariaHasPopup,
  'aria-current': ariaCurrent,
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
      id={id}
      slot={slot}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-haspopup={ariaHasPopup}
      aria-current={ariaCurrent}
    >
      {children}
    </HeroButton>
  );
}
