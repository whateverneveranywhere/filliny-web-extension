import { Button } from "../components";
import { Drawer } from "../components/Drawer";
import { RHFShadcnComboBox } from "../components/RHF";
import FormProvider from "../components/RHF/FormProvider";
import { ProfileForm } from "@/lib/containers/profile-form";
import { toast } from "@/lib/hooks/use-toast";
import {
  useActiveProfile,
  useBoolean,
  useChangeActiveFillingProfileMutation,
  useDeleteProfileByIdMutation,
  useProfilesListQuery,
} from "@extension/shared";
import { profileStrorage } from "@extension/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { DTOProfileFillingForm } from "@extension/storage";

const schema = z.object({
  defaultActiveProfileId: z.string(),
});

function ProfileSelector() {
  const profileModal = useBoolean();
  const [editingId, setEditingId] = useState<string>();

  const { activeProfileId, activeProfile } = useActiveProfile();
  // Queries and Mutations
  const { data: profiles, isLoading, isFetching, refetch: refetchProfiles } = useProfilesListQuery();
  const { mutateAsync: deleteProfile, isPending: isDeleting } = useDeleteProfileByIdMutation();
  const { mutateAsync: updateActiveProfile, isPending: isUpdating } = useChangeActiveFillingProfileMutation();

  const methods = useForm({
    defaultValues: {
      defaultActiveProfileId: String(activeProfileId || ""),
    },
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const { setValue } = methods;

  // Memoized handlers
  const handleProfileChange = useCallback(
    async (nextActiveId: string) => {
      if (nextActiveId === activeProfileId) return;

      try {
        await updateActiveProfile({ activeProfileId: nextActiveId });
        setValue("defaultActiveProfileId", nextActiveId);

        // Find the new active profile from the profiles list
        const newActiveProfile = profiles?.find(profile => String(profile.id) === nextActiveId);
        if (newActiveProfile) {
          await profileStrorage.setDefaultProfile(newActiveProfile as unknown as DTOProfileFillingForm);
        }

        toast({ title: "Profile updated successfully" });
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to update profile" });
      }
    },
    [activeProfileId, profiles, updateActiveProfile, setValue],
  );

  const handleDeleteProfile = useCallback(
    async (id: string) => {
      try {
        const isActiveProfile = id === activeProfileId;

        await deleteProfile({ id });
        await refetchProfiles();

        if (isActiveProfile && profiles) {
          // Only reset if we don't have any remaining profiles
          const remainingProfiles = profiles.filter(profile => String(profile.id) !== id);
          if (remainingProfiles.length === 0) {
            await profileStrorage.resetDefaultProfile();
          } else {
            const deletedIndex = profiles.findIndex(profile => String(profile.id) === id);
            const newActiveProfile = remainingProfiles[deletedIndex] || remainingProfiles[deletedIndex - 1];
            if (newActiveProfile) {
              await updateActiveProfile({ activeProfileId: String(newActiveProfile.id) });
              setValue("defaultActiveProfileId", String(newActiveProfile.id));
            }
          }
        }

        toast({ title: "Profile deleted successfully" });
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to delete profile" });
      }
    },
    [deleteProfile, refetchProfiles, activeProfileId, profiles, updateActiveProfile, setValue],
  );

  const handleEditProfile = useCallback(
    (id: string) => {
      setEditingId(id);
      profileModal.onTrue();
    },
    [profileModal],
  );

  const handleDrawerChange = useCallback(
    (isOpen: boolean) => {
      profileModal.setValue(isOpen);
      if (!isOpen) setEditingId(undefined);
    },
    [profileModal],
  );

  const handleFormSubmit = useCallback(() => {
    setEditingId(undefined);
    profileModal.onFalse();
    refetchProfiles();
  }, [profileModal, refetchProfiles]);

  // Initialize default profile if needed
  useEffect(() => {
    if (!activeProfile && profiles?.length) {
      const activeFromApi = profiles.find(item => item.isActive);
      if (activeFromApi) {
        setValue("defaultActiveProfileId", String(activeFromApi.id));
      }
    }
  }, [profiles, activeProfile, setValue]);

  // Add this useEffect to watch for changes in defaultStorageProfile
  useEffect(() => {
    if (activeProfile?.id) {
      setValue("defaultActiveProfileId", String(activeProfile.id));
    }
  }, [activeProfile, setValue]);

  // UI States
  const isDisabled = isDeleting || isUpdating;
  const isLoaderVisible = isLoading || isFetching || isDeleting || isUpdating;
  const profileOptions = useMemo(
    () =>
      profiles?.map(item => ({
        label: item.name,
        value: String(item.id),
      })) || [],
    [profiles],
  );

  return (
    <div className="filliny-flex filliny-w-full filliny-max-w-xl filliny-items-center filliny-gap-2">
      <FormProvider methods={methods}>
        <RHFShadcnComboBox
          placeholder="Select or search profile"
          disabled={isDisabled}
          loading={isLoaderVisible}
          options={profileOptions}
          onDelete={handleDeleteProfile}
          onEdit={handleEditProfile}
          onChange={handleProfileChange}
          value={methods.watch("defaultActiveProfileId")}
          name="defaultActiveProfileId"
          className="filliny-w-full"
          title={""}
        />
      </FormProvider>

      <Button variant="default" size="sm" onClick={profileModal.onTrue} className="filliny-h-9 filliny-w-9 filliny-p-0">
        <Plus className="filliny-h-4 filliny-w-4" />
      </Button>

      <Drawer
        hideFooter
        open={profileModal.value}
        title={editingId ? "Edit Profile" : "New Profile"}
        onOpenChange={handleDrawerChange}>
        <div className="filliny-h-[70vh] filliny-overflow-y-auto">
          <ProfileForm id={editingId} onFormSubmit={handleFormSubmit} />
        </div>
      </Drawer>
    </div>
  );
}

export { ProfileSelector };
