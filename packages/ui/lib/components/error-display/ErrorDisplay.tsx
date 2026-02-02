import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { t } from '@extension/i18n';
import { AlertTriangle } from 'lucide-react';

// ============================================================================
// Internal Sub-components
// ============================================================================

/**
 * Error header with icon, title, and description
 */
const ErrorHeader = () => (
  <div className="filliny-text-center filliny-space-y-4">
    <div className="filliny-mx-auto filliny-flex filliny-h-16 filliny-w-16 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-destructive/10">
      <AlertTriangle className="filliny-h-8 filliny-w-8 filliny-text-destructive" />
    </div>
    <h2 className="filliny-text-2xl filliny-font-bold filliny-text-foreground">{t('displayErrorInfo')}</h2>
    <p className="filliny-text-sm filliny-text-muted-foreground">{t('displayErrorDescription')}.</p>
  </div>
);

/**
 * Stack trace display with collapsible details
 */
const ErrorStackTrace = ({ error }: { error?: Error }) => (
  <Card className="filliny-border-destructive/20">
    <CardContent className="filliny-p-4">
      <div className="filliny-space-y-3">
        <p className="filliny-text-sm filliny-font-medium filliny-text-foreground">{t('displayErrorDetailsInfo')}</p>
        <div className="filliny-overflow-auto filliny-rounded-lg filliny-bg-destructive/5 filliny-p-4">
          <p className="filliny-break-all filliny-font-mono filliny-text-sm filliny-text-destructive">
            {error?.message || t('displayErrorUnknownErrorInfo')}
          </p>
          {error?.stack && (
            <details className="filliny-mt-3">
              <summary className="filliny-cursor-pointer filliny-text-sm filliny-text-destructive/80 hover:filliny-text-destructive">
                Stack trace
              </summary>
              <pre className="filliny-mt-2 filliny-overflow-auto filliny-p-2 filliny-text-xs filliny-text-destructive/70">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Reset button to retry after error
 */
const ErrorResetButton = ({ onReset }: { onReset?: () => void }) => (
  <div className="filliny-flex filliny-items-center filliny-justify-center">
    <Button onClick={onReset} variant="destructive" size="lg">
      {t('displayErrorReset')}
    </Button>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

interface ErrorDisplayProps {
  /** The error object to display */
  error?: Error;
  /** Callback function to reset the error boundary */
  resetErrorBoundary?: () => void;
}

/**
 * Error display component for error boundaries.
 * Shows error information with stack trace and a reset button.
 *
 * @example
 * <ErrorDisplay error={error} resetErrorBoundary={resetErrorBoundary} />
 */
const ErrorDisplay = ({ error, resetErrorBoundary }: ErrorDisplayProps) => (
  <div className="filliny-flex filliny-items-center filliny-justify-center filliny-bg-background filliny-px-4 filliny-py-8">
    <div className="filliny-w-full filliny-max-w-md filliny-space-y-6">
      <ErrorHeader />
      <ErrorStackTrace error={error} />
      <ErrorResetButton onReset={resetErrorBoundary} />
    </div>
  </div>
);

// Export sub-components for standalone use if needed
ErrorDisplay.Header = ErrorHeader;
ErrorDisplay.StackTrace = ErrorStackTrace;
ErrorDisplay.ResetButton = ErrorResetButton;

export { ErrorDisplay };
