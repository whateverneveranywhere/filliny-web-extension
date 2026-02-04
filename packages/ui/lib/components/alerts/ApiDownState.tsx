import { Button } from '../ui/button';
import { ServerCrash } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ApiDownStateProps {
  /** The error object containing connection details */
  error?: Error;
  /** Callback function to retry the connection */
  onRetry?: () => void;
}

// ============================================================================
// Internal Sub-components
// ============================================================================

/**
 * Icon container with server crash visual
 */
const ApiDownIcon = () => (
  <div className="filliny-mx-auto filliny-flex filliny-h-20 filliny-w-20 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-destructive/10">
    <ServerCrash className="filliny-h-10 filliny-w-10 filliny-text-destructive" />
  </div>
);

/**
 * Header text with title and description
 */
const ApiDownHeader = () => (
  <div className="filliny-space-y-2">
    <h2 className="filliny-text-xl filliny-font-bold filliny-text-foreground">Unable to Connect</h2>
    <p className="filliny-text-sm filliny-text-muted-foreground">
      Our servers are currently unreachable. Please check your connection and try again.
    </p>
  </div>
);

/**
 * Error message display box
 */
const ApiDownErrorMessage = ({ message }: { message: string }) => (
  <div className="filliny-rounded-lg filliny-bg-destructive/5 filliny-p-3">
    <p className="filliny-break-all filliny-font-mono filliny-text-xs filliny-text-destructive/80">{message}</p>
  </div>
);

/**
 * Retry button
 */
const ApiDownRetryButton = ({ onRetry }: { onRetry: () => void }) => (
  <Button onClick={onRetry} variant="default" size="lg" className="filliny-w-full">
    Try Again
  </Button>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Full-page blocking error state component for API unreachable scenarios.
 * Displays a centered error message with optional retry functionality.
 *
 * @example
 * <ApiDownState error={error} onRetry={() => refetch()} />
 */
const ApiDownState = ({ error, onRetry }: ApiDownStateProps) => (
  <div className="filliny-flex filliny-min-h-screen filliny-items-center filliny-justify-center filliny-bg-background filliny-p-4">
    <div className="filliny-w-full filliny-max-w-sm filliny-space-y-6 filliny-text-center">
      <ApiDownIcon />
      <ApiDownHeader />
      {error?.message && <ApiDownErrorMessage message={error.message} />}
      {onRetry && <ApiDownRetryButton onRetry={onRetry} />}
    </div>
  </div>
);

// Export sub-components for standalone use if needed
ApiDownState.Icon = ApiDownIcon;
ApiDownState.Header = ApiDownHeader;
ApiDownState.ErrorMessage = ApiDownErrorMessage;
ApiDownState.RetryButton = ApiDownRetryButton;

export { ApiDownState };
export type { ApiDownStateProps };
