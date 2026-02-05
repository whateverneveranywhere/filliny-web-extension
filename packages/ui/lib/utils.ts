import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

const twMerge = extendTailwindMerge({ prefix: 'filliny-' });

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/**
 * Standardized class names for circular icon buttons.
 * Use this constant for consistent styling across all icon buttons.
 *
 * @example
 * <Button className={cn(iconButtonClasses, 'filliny-bg-primary')}>
 *   <Icon />
 * </Button>
 */
/**
 * Standardized class names for circular icon buttons.
 * Size is 32px (size-8) for subtle secondary buttons.
 */
export const iconButtonClasses =
  'filliny-size-8 filliny-min-h-8 filliny-min-w-8 filliny-max-h-8 filliny-max-w-8 filliny-overflow-hidden !filliny-rounded-full filliny-aspect-square filliny-flex-shrink-0' as const;
