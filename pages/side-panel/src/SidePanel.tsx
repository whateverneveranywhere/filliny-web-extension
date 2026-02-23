import { useAuthContext, useAuthHealthCheckQuery, AuthProvider, useUsageRefresh } from '@extension/shared';
import { ApiDownState, Loading, QueryClientProvider, RouterProvider, SigninPage, withPageWrapper } from '@extension/ui';

/**
 * Inner component that handles auth flow with a single /auth-health check.
 *
 * Flow:
 * 1. Get token from Chrome storage via AuthContext
 * 2. If no token → show sign-in (no API call needed)
 * 3. If token exists → call /auth-health to validate
 *    - 200 → authenticated → show app
 *    - 401 → token invalid → httpService clears token → shows sign-in
 *    - Network error → API down → show error
 */
const AppContent = () => {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuthContext();

  // Single /auth-health call replaces both /health and /auth-health
  // Only fires when authenticated (has token to validate)
  const {
    isLoading: isHealthLoading,
    isError: isApiError,
    error: apiError,
    refetch: retryHealthCheck,
  } = useAuthHealthCheckQuery(isAuthenticated);

  // Listen for usage refresh messages from the background script
  // to update the usage count immediately after form fills
  useUsageRefresh();

  // Wait for token retrieval from Chrome storage
  if (isAuthLoading) {
    return <Loading variant="fullscreen" />;
  }

  // No token → show sign-in (don't need to check API health)
  if (!isAuthenticated) {
    return <SigninPage />;
  }

  // Validating token against API
  if (isHealthLoading) {
    return <Loading variant="fullscreen" />;
  }

  // API error while authenticated = API is down (401s auto-clear token → isAuthenticated flips)
  if (isApiError) {
    return <ApiDownState error={apiError as Error} onRetry={() => retryHealthCheck()} />;
  }

  return <RouterProvider />;
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
