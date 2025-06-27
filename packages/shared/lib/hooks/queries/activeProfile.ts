import { useProfilesListQuery, useFillingProfileById } from "./profileQueries.js";
import { useStorage } from "../../hooks/index.js";
import { profileStrorage } from "@extension/storage";
import { useMemo } from "react";
import type { DTOFillingProfileItem } from "@extension/storage";

export const useActiveProfile = () => {
  const defaultStorageProfile = useStorage(profileStrorage);
  const { data: profiles } = useProfilesListQuery();

  const activeProfileId = useMemo(
    () =>
      defaultStorageProfile?.id?.toString() ||
      profiles?.find((item: DTOFillingProfileItem) => item.isActive)?.id?.toString() ||
      "",
    [profiles, defaultStorageProfile],
  );

  // Only fetch profile by ID when we have a valid ID
  const { data: activeProfile } = useFillingProfileById(activeProfileId);

  // We don't need to set the profile in storage here since it's already done in the home-page component
  // This avoids duplicate storage operations and potential race conditions

  return {
    activeProfile,
    activeProfileId,
    profiles,
  };
};
