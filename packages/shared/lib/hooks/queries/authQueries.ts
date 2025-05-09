import { useQuery } from "@tanstack/react-query";
import { authHealthCheckService } from "../../services/api/Auth/index.js";
import { authStorage } from "@extension/storage";
import { useEffect } from "react";

export const useAuthHealthCheckQuery = () => {
  const queryResult = useQuery({
    queryKey: ["healthCheck"],
    queryFn: authHealthCheckService,
    // Add caching configuration to prevent excessive health check requests
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Handle error by deleting the token if there is an error
  useEffect(() => {
    if (queryResult.isError) {
      authStorage.deleteToken();
      console.error("Auth health check failed. Token deleted.");
    }
  }, [queryResult.isError]);

  return queryResult;
};
