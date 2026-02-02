import { Loading } from './ui/loading';
import type { LoadingSize } from './ui/loading';

interface LoadingSpinnerProps {
  /** Size of the spinner - can be a preset or legacy number value */
  size?: LoadingSize | number;
  /** Custom class name */
  className?: string;
}

/**
 * Full-screen loading spinner component.
 * This is a wrapper around the unified Loading component for backward compatibility.
 *
 * @deprecated Prefer using <Loading fullScreen /> or <Loading variant="page" /> directly.
 *
 * @example
 * // Basic usage
 * <LoadingSpinner />
 *
 * // With preset size
 * <LoadingSpinner size="xl" />
 */
export const LoadingSpinner = ({ size = 'xl', className }: LoadingSpinnerProps) => {
  // Convert legacy number size to preset size
  const sizePreset: LoadingSize = typeof size === 'number' ? 'xl' : size;

  return <Loading fullScreen size={sizePreset} className={className} />;
};
