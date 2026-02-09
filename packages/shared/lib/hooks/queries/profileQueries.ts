import {
  getFillingProfileByIdService,
  getPOVsListService,
  getProfilesListService,
  getSuggestedWebsitesService,
  getTonesListService,
} from '../../services/api/Profiles/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';
import type { DTOTone, DTOPov, DTOSuggestedWebsite } from '@extension/storage';

/**
 * Options for useProfilesListQuery hook
 */
interface UseProfilesListQueryOptions {
  /** Whether to enable the query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to fetch the list of user profiles
 * Returns profile list data, loading state, and error state
 *
 * @param options.enabled - Whether the query should be enabled (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
const useProfilesListQuery = (options?: UseProfilesListQueryOptions) => {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.profile.list(),
    queryFn: getProfilesListService,
    enabled,
    staleTime: 15 * 1000, // 15 seconds - extension needs fresh data
    gcTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to extension
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch profiles list',
    },
  });
};

/**
 * Options for useSuggestedWebsites hook
 */
interface UseSuggestedWebsitesOptions {
  /** Whether to enable the query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to fetch suggested websites for quick profile creation
 * Returns suggested websites data with proper typing for label/value structure
 *
 * @param options.enabled - Whether the query should be enabled (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
const useSuggestedWebsites = (options?: UseSuggestedWebsitesOptions) => {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.profile.suggestedWebsites(),
    queryFn: getSuggestedWebsitesService,
    enabled,
    // Transform data to ensure consistent structure for UI components
    // Handle case where API might return null/undefined instead of empty array
    select: (data: DTOSuggestedWebsite[] | null | undefined) => {
      if (!Array.isArray(data)) {
        return [];
      }
      return data.map((item: DTOSuggestedWebsite) => ({
        id: item.id,
        label: item.label,
        value: item.value,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - suggested websites don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch suggested websites',
    },
  });
};

/**
 * Options for useFillingProfileById hook
 */
interface UseFillingProfileByIdOptions {
  /** Whether to enable the query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to fetch a specific profile by ID
 * Only fetches when a valid ID is provided and query is enabled
 *
 * @param id - The profile ID to fetch
 * @param options.enabled - Whether the query should be enabled (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
const useFillingProfileById = (id: string, options?: UseFillingProfileByIdOptions) => {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.profile.detail(id),
    queryFn: () => getFillingProfileByIdService(id),
    enabled: enabled && Boolean(id && id.length > 0),
    staleTime: 15 * 1000, // 15 seconds - extension needs fresh data
    gcTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to extension
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch profile details',
    },
  });
};

/**
 * Options for useTonesListQuery hook
 */
interface UseTonesListQueryOptions {
  /** Whether to enable the query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to fetch available writing tones
 * Returns tones transformed for select/combobox components
 *
 * @param options.enabled - Whether the query should be enabled (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
const useTonesListQuery = (options?: UseTonesListQueryOptions) => {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.profile.tones(),
    queryFn: getTonesListService,
    enabled,
    select: (data: DTOTone[]) => data.map((item: DTOTone) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity, // Static data - tones rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch tones list',
    },
  });
};

/**
 * Options for usePOVListQuery hook
 */
interface UsePOVListQueryOptions {
  /** Whether to enable the query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to fetch available point of view options
 * Returns POVs transformed for select/combobox components
 *
 * @param options.enabled - Whether the query should be enabled (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
const usePOVListQuery = (options?: UsePOVListQueryOptions) => {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.profile.povs(),
    queryFn: getPOVsListService,
    enabled,
    select: (data: DTOPov[]) => data.map((item: DTOPov) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity, // Static data - POVs rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch POV list',
    },
  });
};

export { useProfilesListQuery, useSuggestedWebsites, useFillingProfileById, useTonesListQuery, usePOVListQuery };
