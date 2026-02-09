import { useApiHealthCheck, useAuthContext, AuthProvider, useUsageRefresh } from '@extension/shared';
import { ApiDownState, Loading, QueryClientProvider, RouterProvider, SigninPage, withPageWrapper } from '@extension/ui';

/**
 * Inner component that handles API health check and auth flow.
 * Must be inside AuthProvider to use useAuthContext.
 */
const AppContent = () => {
  const {
    isLoading: isHealthLoading,
    isError: isApiDown,
    error: apiError,
    refetch: retryHealthCheck,
  } = useApiHealthCheck();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuthContext();

  // Listen for usage refresh messages from the background script
  // to update the usage count immediately after form fills
  useUsageRefresh();

  // Check API health first
  if (isHealthLoading) {
    return <Loading variant="fullscreen" />;
  }

  // Show blocking error if API is down
  if (isApiDown) {
    return <ApiDownState error={apiError as Error} onRetry={() => retryHealthCheck()} />;
  }

  // Normal auth flow
  if (isAuthLoading) {
    return <Loading variant="fullscreen" />;
  }

  return isAuthenticated ? <RouterProvider /> : <SigninPage />;
};

/**
 * HomePage component with provider hierarchy:
 * QueryClientProvider -> AuthProvider -> AppContent
 *
 * AuthProvider must be inside QueryClientProvider since it uses hooks that may
 * depend on React Query. This hierarchy ensures:
 * 1. React Query is available to all components
 * 2. Auth state is available via context to all child components
 * 3. Auth-dependent hooks like usePlanLimits automatically disable API calls
 *    when user is not authenticated, preventing 401 errors
 */
const HomePage = () => (
  <QueryClientProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

export default withPageWrapper(HomePage);
