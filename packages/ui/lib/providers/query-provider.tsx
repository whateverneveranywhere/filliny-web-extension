import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type React from "react";

interface Props {
  children: React.ReactNode;
}

function QueryClientProvider(props: Props) {
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
            // Retry failed queries but with more reasonable settings
            retry: 2,
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
}

export default QueryClientProvider;
