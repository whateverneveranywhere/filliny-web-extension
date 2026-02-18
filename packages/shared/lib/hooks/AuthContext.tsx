import { useExtensionAuth } from './useExtensionAuth.js';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

// ============================================================================
// Auth Context Value
// ============================================================================

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

// ============================================================================
// Auth Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Auth Provider Props
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Provides authentication state to all child components.
 *
 * This provider wraps useExtensionAuth and makes auth state available via context,
 * preventing redundant auth state calculations and enabling auth-aware hooks like
 * usePlanLimits to automatically disable API calls when user is not authenticated.
 *
 * Must be placed INSIDE QueryClientProvider since useExtensionAuth uses Chrome APIs
 * that may trigger React Query hooks.
 *
 * @example
 * ```tsx
 * <QueryClientProvider>
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * </QueryClientProvider>
 * ```
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useExtensionAuth();

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      token: auth.token,
    }),
    [auth.isAuthenticated, auth.isLoading, auth.token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuthContext - Hook to access authentication state from AuthContext.
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading, token } = useAuthContext();
 * if (isLoading) return <Loading />;
 * if (!isAuthenticated) return <SignIn />;
 * ```
 */
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

/**
 * useAuthContextSafe - Hook to access authentication state, returning null if outside provider.
 *
 * Use this when the component may be used both inside and outside AuthProvider.
 *
 * @returns AuthContextValue | null
 *
 * @example
 * ```tsx
 * const auth = useAuthContextSafe();
 * const isAuthenticated = auth?.isAuthenticated ?? false;
 * ```
 */
export const useAuthContextSafe = (): AuthContextValue | null => useContext(AuthContext);
