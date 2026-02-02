/**
 * Centralized React Query keys for consistent cache management
 *
 * This module provides type-safe query keys that can be used across
 * queries and mutations to ensure consistent cache invalidation.
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * Query key factory for all application queries
 * Provides a hierarchical structure for query key management
 */
export const queryKeys = {
  /**
   * Auth-related query keys
   */
  auth: {
    all: ['auth'] as const,
    healthCheck: () => [...queryKeys.auth.all, 'healthCheck'] as const,
  },

  /**
   * Profile-related query keys
   */
  profile: {
    all: ['profile'] as const,
    list: () => [...queryKeys.profile.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.profile.all, 'detail', id] as const,
    suggestedWebsites: () => [...queryKeys.profile.all, 'suggestedWebsites'] as const,
    tones: () => [...queryKeys.profile.all, 'tones'] as const,
    povs: () => [...queryKeys.profile.all, 'povs'] as const,
  },

  /**
   * Dashboard-related query keys
   */
  dashboard: {
    all: ['dashboard'] as const,
    overview: () => [...queryKeys.dashboard.all, 'overview'] as const,
  },
} as const;

/**
 * Helper type to extract query key types
 */
export type QueryKeyFactory = typeof queryKeys;

/**
 * Invalidation helpers for common operations
 * These provide centralized, consistent invalidation patterns
 */

/**
 * Invalidate all profile-related queries
 */
export const invalidateProfileQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });

/**
 * Invalidate the profile list query
 */
export const invalidateProfileList = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.list() });

/**
 * Invalidate a specific profile detail query
 */
export const invalidateProfileDetail = (queryClient: QueryClient, id: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(id) });

/**
 * Invalidate all dashboard-related queries
 */
export const invalidateDashboardQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

/**
 * Invalidate all auth-related queries
 */
export const invalidateAuthQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });

/**
 * Centralized query invalidation helper for profile mutations
 * Ensures consistent cache invalidation across all profile-related mutations
 *
 * @param queryClient - The React Query client instance
 * @param profileId - Optional profile ID for specific profile detail invalidation
 */
export const invalidateProfileMutationQueries = async (queryClient: QueryClient, profileId?: string): Promise<void> => {
  const invalidations = [invalidateProfileList(queryClient), invalidateDashboardQueries(queryClient)];

  if (profileId) {
    invalidations.push(invalidateProfileDetail(queryClient, profileId));
  }

  await Promise.all(invalidations);
};
