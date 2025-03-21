import { useMemo, useEffect } from "react";
import { useStorage } from "../../hooks/index.js";
import { profileStrorage, type DTOFillingProfileItem } from "@extension/storage";
import { useProfilesListQuery, useFillingProfileById } from "./profileQueries.js";

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

  const { data: activeProfile } = useFillingProfileById(activeProfileId);

  // Set the default profile in storage whenever it changes
  useEffect(() => {
    if (!profiles?.length) {
      profileStrorage.setDefaultProfile(undefined);
    } else if (activeProfile) {
      profileStrorage.setDefaultProfile(activeProfile);
    }
  }, [activeProfile, profiles]);

  return {
    activeProfile,
    activeProfileId,
    profiles,
  };
};
