import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type React from 'react';

interface Props {
  children: React.ReactNode;
}

const QueryClientProvider = (props: Props) => {
  const { children } = props;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Increase staleTime to reduce unnecessary refetches
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Set a reasonable gcTime for garbage collection
            gcTime: 10 * 60 * 1000, // 10 minutes
            // Disable automatic refetching on window focus which can cause issues in browser extensions
            refetchOnWindowFocus: false,
            // Don't retry on 401/403 errors (auth failures shouldn't be retried)
            // Only retry on network errors or 5xx server errors
            retry: (failureCount, error) => {
              // Don't retry on auth errors or client errors
              if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as { status: number }).status;
                if (status >= 400 && status < 500) {
                  return false;
                }
              }
              // For network/server errors, retry up to 2 times
              return failureCount < 2;
            },
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      }),
  );

  return (
    <ReactQueryClientProvider client={queryClient}>
      <>{children}</>
    </ReactQueryClientProvider>
  );
};

export default QueryClientProvider;
