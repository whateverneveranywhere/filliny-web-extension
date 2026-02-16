import { useProfilesListQuery, useFillingProfileById } from './profileQueries.js';
import { useStorage } from '../../hooks/index.js';
import { profileStorage } from '@extension/storage';
import { useMemo } from 'react';
import type { DTOFillingProfileItem } from '@extension/storage';

/**
 * Hook to get the active profile and profiles list.
 * Auth-awareness is handled automatically by the underlying query hooks
 * via AuthContext — no explicit `enabled` flag needed.
 */
export const useActiveProfile = () => {
  const defaultStorageProfile = useStorage(profileStorage);
  const { data: profiles } = useProfilesListQuery();

  const activeProfileId = useMemo(
    () =>
      defaultStorageProfile?.id?.toString() ||
      profiles?.find((item: DTOFillingProfileItem) => item.isActive)?.id?.toString() ||
      '',
    [profiles, defaultStorageProfile],
  );

  const { data: activeProfile } = useFillingProfileById(activeProfileId);

  return {
    activeProfile,
    activeProfileId,
    profiles,
  };
};
