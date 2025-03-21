import type React from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from "@tanstack/react-query";

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
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000,
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
