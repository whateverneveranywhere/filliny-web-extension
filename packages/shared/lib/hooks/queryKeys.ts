/**
 * Centralized React Query keys for consistent cache management
 *
 * This module provides type-safe query keys that can be used across
 * queries and mutations to ensure consistent cache invalidation.
 *
 * Query Key Hierarchy:
 * - queryKeys.profile.all - Base key for all profile queries
 * - queryKeys.profile.list() - Profile list query
 * - queryKeys.profile.detail(id) - Specific profile detail
 * - queryKeys.profile.suggestedWebsites() - Suggested websites for quick add
 * - queryKeys.profile.tones() - Available tones
 * - queryKeys.profile.povs() - Available POVs
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
   * System/API health-related query keys
   */
  system: {
    all: ['system'] as const,
    apiHealth: () => [...queryKeys.system.all, 'apiHealth'] as const,
  },

  /**
   * Profile-related query keys
   */
  profile: {
    all: ['profile'] as const,
    list: () => [...queryKeys.profile.all, 'list'] as const,
    lists: () => [...queryKeys.profile.all, 'list'] as const, // Alias for consistency
    detail: (id: string) => [...queryKeys.profile.all, 'detail', id] as const,
    details: () => [...queryKeys.profile.all, 'detail'] as const, // All detail queries
    suggestedWebsites: () => [...queryKeys.profile.all, 'suggestedWebsites'] as const,
    tones: () => [...queryKeys.profile.all, 'tones'] as const,
    povs: () => [...queryKeys.profile.all, 'povs'] as const,
    // Authorized files
    files: {
      all: (profileId: string) => [...queryKeys.profile.all, 'files', profileId] as const,
      list: (profileId: string) => [...queryKeys.profile.files.all(profileId), 'list'] as const,
    },
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
 * Invalidate all profile-related queries (list, details, etc.)
 * Uses refetchType 'all' to ensure even inactive queries are refetched
 */
export const invalidateProfileQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.all, refetchType: 'all' });

/**
 * Invalidate the profile list query
 */
export const invalidateProfileList = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.list(), refetchType: 'all' });

/**
 * Invalidate all profile detail queries
 */
export const invalidateProfileDetails = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.details(), refetchType: 'all' });

/**
 * Invalidate a specific profile detail query
 */
export const invalidateProfileDetail = (queryClient: QueryClient, id: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(id), refetchType: 'all' });

/**
 * Invalidate all dashboard-related queries
 */
export const invalidateDashboardQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: 'all' });

/**
 * Invalidate all auth-related queries
 */
export const invalidateAuthQueries = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.all, refetchType: 'all' });

/**
 * Centralized query invalidation helper for profile mutations
 * Ensures consistent cache invalidation across all profile-related mutations
 *
 * Invalidates:
 * - Profile list (always)
 * - Dashboard overview (always - shows profile counts)
 * - Specific profile detail (when profileId provided)
 * - All profile details (when active profile changes to refresh isActive status)
 *
 * @param queryClient - The React Query client instance
 * @param profileId - Optional profile ID for specific profile detail invalidation
 * @param options - Optional configuration for invalidation behavior
 */
export const invalidateProfileMutationQueries = async (
  queryClient: QueryClient,
  profileId?: string,
  options?: { invalidateAllDetails?: boolean },
): Promise<void> => {
  const invalidations: Promise<void>[] = [invalidateProfileList(queryClient), invalidateDashboardQueries(queryClient)];

  if (profileId) {
    invalidations.push(invalidateProfileDetail(queryClient, profileId));
  }

  // Optionally invalidate all profile details (useful when isActive changes)
  if (options?.invalidateAllDetails) {
    invalidations.push(invalidateProfileDetails(queryClient));
  }

  await Promise.all(invalidations);
};

/**
 * Invalidation patterns for common operations
 * Pre-defined patterns for common use cases
 */
export const invalidationPatterns = {
  /** Invalidate after profile CRUD operations */
  profileMutation: (queryClient: QueryClient, profileId?: string) =>
    invalidateProfileMutationQueries(queryClient, profileId),

  /** Invalidate after active profile change (affects all profiles) */
  activeProfileChange: (queryClient: QueryClient, profileId: string) =>
    invalidateProfileMutationQueries(queryClient, profileId, { invalidateAllDetails: true }),

  /** Invalidate after profile deletion */
  profileDeletion: async (queryClient: QueryClient, profileId: string) => {
    // Remove from cache immediately
    queryClient.removeQueries({ queryKey: queryKeys.profile.detail(profileId) });
    // Then invalidate related queries
    await invalidateProfileMutationQueries(queryClient, profileId);
  },
} as const;
