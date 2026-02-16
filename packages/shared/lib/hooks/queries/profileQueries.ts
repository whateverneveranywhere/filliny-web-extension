import {
  getFillingProfileByIdService,
  getPOVsListService,
  getProfilesListService,
  getSuggestedWebsitesService,
  getTonesListService,
} from '../../services/api/Profiles/index.js';
import { useAuthContextSafe } from '../AuthContext.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';
import type { DTOTone, DTOPov, DTOSuggestedWebsite } from '@extension/storage';

/**
 * Options for profile query hooks.
 */
interface ProfileQueryOptions {
  /** Override for enabled state. When omitted, auto-detects from AuthContext. */
  enabled?: boolean;
}

/**
 * Resolves the effective `enabled` value for a profile query.
 * - If `explicitEnabled` is provided, it takes precedence.
 * - Otherwise, uses `isAuthenticated` from AuthContext (false when outside AuthProvider).
 */
const useProfileQueryEnabled = (explicitEnabled: boolean | undefined): boolean => {
  const authContext = useAuthContextSafe();
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  return explicitEnabled !== undefined ? explicitEnabled : isAuthenticated;
};

/**
 * Hook to fetch the list of user profiles.
 * Auto-disables when user is not authenticated (prevents 401 errors).
 */
const useProfilesListQuery = (options?: ProfileQueryOptions) => {
  const enabled = useProfileQueryEnabled(options?.enabled);
  return useQuery({
    queryKey: queryKeys.profile.list(),
    queryFn: getProfilesListService,
    enabled,
    staleTime: 15 * 1000,
    gcTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
    meta: {
      errorMessage: 'Failed to fetch profiles list',
    },
  });
};

/**
 * Hook to fetch suggested websites for quick profile creation.
 * Auto-disables when user is not authenticated (prevents 401 errors).
 */
const useSuggestedWebsites = (options?: ProfileQueryOptions) => {
  const enabled = useProfileQueryEnabled(options?.enabled);
  return useQuery({
    queryKey: queryKeys.profile.suggestedWebsites(),
    queryFn: getSuggestedWebsitesService,
    enabled,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    meta: {
      errorMessage: 'Failed to fetch suggested websites',
    },
  });
};

/**
 * Hook to fetch a specific profile by ID.
 * Auto-disables when user is not authenticated or ID is empty (prevents 401 errors).
 */
const useFillingProfileById = (id: string, options?: ProfileQueryOptions) => {
  const enabled = useProfileQueryEnabled(options?.enabled);
  return useQuery({
    queryKey: queryKeys.profile.detail(id),
    queryFn: () => getFillingProfileByIdService(id),
    enabled: enabled && Boolean(id && id.length > 0),
    staleTime: 15 * 1000,
    gcTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
    meta: {
      errorMessage: 'Failed to fetch profile details',
    },
  });
};

/**
 * Hook to fetch available writing tones.
 * Auto-disables when user is not authenticated (prevents 401 errors).
 */
const useTonesListQuery = (options?: ProfileQueryOptions) => {
  const enabled = useProfileQueryEnabled(options?.enabled);
  return useQuery({
    queryKey: queryKeys.profile.tones(),
    queryFn: getTonesListService,
    enabled,
    select: (data: DTOTone[]) => data.map((item: DTOTone) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    meta: {
      errorMessage: 'Failed to fetch tones list',
    },
  });
};

/**
 * Hook to fetch available point of view options.
 * Auto-disables when user is not authenticated (prevents 401 errors).
 */
const usePOVListQuery = (options?: ProfileQueryOptions) => {
  const enabled = useProfileQueryEnabled(options?.enabled);
  return useQuery({
    queryKey: queryKeys.profile.povs(),
    queryFn: getPOVsListService,
    enabled,
    select: (data: DTOPov[]) => data.map((item: DTOPov) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    meta: {
      errorMessage: 'Failed to fetch POV list',
    },
  });
};

export { useProfilesListQuery, useSuggestedWebsites, useFillingProfileById, useTonesListQuery, usePOVListQuery };
