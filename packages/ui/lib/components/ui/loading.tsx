import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/** Size presets for the loading spinner */
type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

/** Variant presets for different use cases */
type LoadingVariant = 'spinner' | 'page' | 'inline';

interface LoadingProps {
  /** Custom class name for the spinner */
  className?: string;
  /** Size of the spinner */
  size?: LoadingSize;
  /** Variant determines the container layout */
  variant?: LoadingVariant;
  /** Optional message to display below the spinner */
  message?: string;
  /** Color of the spinner (defaults to current text color) */
  color?: string;
  /** Whether to show a centered full-screen spinner (legacy support) */
  fullScreen?: boolean;
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'filliny-size-4',
  md: 'filliny-size-5',
  lg: 'filliny-size-6',
  xl: 'filliny-size-8',
};

const variantClasses: Record<LoadingVariant, string> = {
  spinner: 'filliny-m-auto filliny-flex filliny-size-full filliny-items-center filliny-justify-center',
  page: 'filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-min-h-[200px] filliny-w-full filliny-gap-4',
  inline: 'filliny-inline-flex filliny-items-center filliny-gap-2',
};

/**
 * Unified loading spinner component.
 * Consolidates multiple loading patterns into a single reusable component.
 *
 * @example
 * // Basic spinner
 * <Loading />
 *
 * // Large spinner with message
 * <Loading size="xl" message="Loading data..." />
 *
 * // Page-level loading state
 * <Loading variant="page" message="Waiting for page to load..." />
 *
 * // Inline loading (for buttons, text, etc.)
 * <Loading variant="inline" size="sm" message="Saving..." />
 *
 * // Full screen (legacy support for LoadingSpinner)
 * <Loading fullScreen size="xl" />
 */
const Loading = ({ className, size = 'md', variant = 'spinner', message, color, fullScreen = false }: LoadingProps) => {
  // Legacy full-screen support
  if (fullScreen) {
    return (
      <div className="filliny-flex filliny-min-h-screen filliny-items-center filliny-justify-center">
        <Loader2
          className={cn('filliny-animate-spin', sizeClasses.xl, className)}
          style={color ? { color } : undefined}
        />
      </div>
    );
  }

  return (
    <div className={variantClasses[variant]}>
      <Loader2
        className={cn('filliny-animate-spin', sizeClasses[size], className)}
        style={color ? { color } : undefined}
      />
      {message && <span className="filliny-text-sm filliny-text-muted-foreground">{message}</span>}
    </div>
  );
};

export { Loading };
export type { LoadingProps, LoadingSize, LoadingVariant };
