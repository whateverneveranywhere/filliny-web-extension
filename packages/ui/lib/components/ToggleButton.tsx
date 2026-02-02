import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { ButtonProps } from './ui/button';
import type { ComponentPropsWithoutRef } from 'react';

type ToggleButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> &
  Pick<ButtonProps, 'variant' | 'size'> & {
    /** Custom onClick handler. If not provided, defaults to toggling the theme */
    onClick?: () => void;
  };

/**
 * Theme toggle button component.
 * Automatically responds to theme changes and can toggle the theme on click.
 *
 * This component uses the unified Button under the hood for consistent styling.
 *
 * @example
 * // Basic usage (toggles theme on click)
 * <ToggleButton>Toggle Theme</ToggleButton>
 *
 * // With custom onClick
 * <ToggleButton onClick={handleClick}>Do Something</ToggleButton>
 */
export const ToggleButton = ({
  className,
  children,
  onClick,
  variant = 'outline',
  size = 'default',
  ...props
}: ToggleButtonProps) => {
  const { isLight } = useStorage(exampleThemeStorage);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      exampleThemeStorage.toggle();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'filliny-mt-4 filliny-font-bold filliny-shadow hover:filliny-scale-105',
        isLight
          ? 'filliny-border-black filliny-bg-white filliny-text-black'
          : 'filliny-border-white filliny-bg-black filliny-text-white',
        className,
      )}
      onClick={handleClick}
      {...props}>
      {children}
    </Button>
  );
};
