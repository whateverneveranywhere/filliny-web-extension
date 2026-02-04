import { Button } from './ui/button';
import { cn } from '../utils';
import type { BinaryTheme } from '@extension/shared';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Binary theme type (light/dark without system option)
 */
type BinaryThemeType = `${BinaryTheme}`;

export type TWButtonProps = {
  /** Theme determines the button's color scheme */
  theme?: BinaryThemeType;
} & ComponentPropsWithoutRef<'button'>;

/**
 * Theme-aware button component.
 *
 * @deprecated Prefer using <Button variant="outline" /> or <Button variant="secondary" />
 * with appropriate className for theme-specific styling.
 *
 * @example
 * // Preferred approach:
 * <Button variant="outline" className={isLight ? 'bg-white text-black' : 'bg-black text-white'}>
 *   Click me
 * </Button>
 */
export const TailwindButton = ({ theme: _theme, className, children, ...props }: TWButtonProps) => (
  <Button
    variant="ghost"
    className={cn(
      'filliny-py-1 filliny-px-4 filliny-rounded filliny-shadow hover:filliny-scale-105',
      'filliny-bg-background filliny-text-foreground',
      className,
    )}
    {...props}>
    {children}
  </Button>
);
