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
export const iconButtonClasses =
  'filliny-size-10 filliny-min-h-10 filliny-min-w-10 filliny-overflow-hidden !filliny-rounded-full' as const;
