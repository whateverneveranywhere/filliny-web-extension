import { useProfilesListQuery, useFillingProfileById } from './profileQueries.js';
import { useStorage } from '../../hooks/index.js';
import { profileStorage } from '@extension/storage';
import { useMemo } from 'react';
import type { DTOFillingProfileItem } from '@extension/storage';

/**
 * Options for useActiveProfile hook
 */
interface UseActiveProfileOptions {
  /** Whether to enable the underlying queries. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to get the active profile and profiles list
 *
 * @param options.enabled - Whether to enable the underlying queries (default: true)
 *                          Pass false when user is not authenticated to prevent 401 errors
 */
export const useActiveProfile = (options?: UseActiveProfileOptions) => {
  const { enabled = true } = options ?? {};
  const defaultStorageProfile = useStorage(profileStorage);
  const { data: profiles } = useProfilesListQuery({ enabled });

  const activeProfileId = useMemo(
    () =>
      defaultStorageProfile?.id?.toString() ||
      profiles?.find((item: DTOFillingProfileItem) => item.isActive)?.id?.toString() ||
      '',
    [profiles, defaultStorageProfile],
  );

  // Only fetch profile by ID when we have a valid ID and queries are enabled
  const { data: activeProfile } = useFillingProfileById(activeProfileId, { enabled });

  // We don't need to set the profile in storage here since it's already done in the home-page component
  // This avoids duplicate storage operations and potential race conditions

  return {
    activeProfile,
    activeProfileId,
    profiles,
  };
};
