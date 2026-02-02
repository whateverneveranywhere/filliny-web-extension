import { t } from '@extension/i18n';

// ============================================================================
// Internal Sub-components
// ============================================================================

/**
 * Warning icon SVG component
 */
const WarningIcon = ({ className }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

/**
 * Error header with icon, title, and description
 */
const ErrorHeader = () => (
  <div className="text-center">
    <WarningIcon className="mx-auto h-24 w-24 text-red-500" />
    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{t('displayErrorInfo')}</h2>
    <p className="mt-2 text-sm text-gray-600">{t('displayErrorDescription')}.</p>
  </div>
);

/**
 * Stack trace display with collapsible details
 */
const ErrorStackTrace = ({ error }: { error?: Error }) => (
  <div className="overflow-hidden rounded-lg bg-white shadow">
    <div className="px-4 py-5 sm:p-6">
      <div className="text-sm text-gray-500">
        <p className="mb-2 font-medium text-gray-700">{t('displayErrorDetailsInfo')}</p>
        <div className="overflow-auto rounded-md bg-red-50 p-4">
          <p className="break-all font-mono text-red-700">{error?.message || t('displayErrorUnknownErrorInfo')}</p>
          {error?.stack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-red-700">Stack trace</summary>
              <pre className="mt-2 overflow-auto p-2 text-xs text-red-800">{error.stack}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Reset button to retry after error
 */
const ErrorResetButton = ({ onReset }: { onReset?: () => void }) => (
  <div className="flex items-center justify-center">
    <button
      onClick={onReset}
      className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
      {t('displayErrorReset')}
    </button>
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
export const ErrorDisplay = ({ error, resetErrorBoundary }: ErrorDisplayProps) => (
  <div className="flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
    <div className="w-full max-w-md space-y-8">
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
ErrorDisplay.WarningIcon = WarningIcon;
