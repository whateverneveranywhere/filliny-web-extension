import { Drawer } from '../components/drawer';
import { RHFShadcnComboBox } from '../components/rhf';
import FormProvider from '../components/rhf/FormProvider';
import { ProfileForm } from '../containers/profile-form';
import { toast } from '../hooks/use-toast';
import {
  ProfileSelectorSchema,
  useActiveProfile,
  useBoolean,
  useChangeActiveFillingProfileMutation,
  useDeleteProfileByIdMutation,
  useProfilesListQuery,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormValues, ProfileSelectorFormValues } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

const ProfileSelector = () => {
  const profileModal = useBoolean();
  const [editingId, setEditingId] = useState<string>();

  const { activeProfileId, activeProfile } = useActiveProfile();
  // Queries and Mutations
  const { data: profiles, isLoading, isFetching } = useProfilesListQuery();
  const { mutateAsync: deleteProfile, isPending: isDeleting } = useDeleteProfileByIdMutation();
  const { mutateAsync: updateActiveProfile, isPending: isUpdating } = useChangeActiveFillingProfileMutation();

  const methods = useForm<ProfileSelectorFormValues>({
    defaultValues: {
      defaultActiveProfileId: String(activeProfileId || ''),
    },
    resolver: zodResolver(ProfileSelectorSchema),
    mode: 'onChange',
  });

  const { setValue } = methods;

  // Memoized handlers
  const handleProfileChange = useCallback(
    async (nextActiveIdValue: FormValues) => {
      const nextActiveId = String(nextActiveIdValue);
      if (!nextActiveIdValue || nextActiveId === activeProfileId) return;

      try {
        await updateActiveProfile({ activeProfileId: nextActiveId });
        setValue('defaultActiveProfileId', nextActiveId);

        // Find the new active profile from the profiles list
        const newActiveProfile = profiles?.find(profile => String(profile.id) === nextActiveId);
        if (newActiveProfile) {
          await profileStorage.setDefaultProfile(newActiveProfile as unknown as DTOProfileFillingForm);
        }

        toast({ title: 'Profile updated successfully' });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to update profile' });
      }
    },
    [activeProfileId, profiles, updateActiveProfile, setValue],
  );

  const handleDeleteProfile = useCallback(
    async (id: string) => {
      try {
        const isActiveProfile = id === activeProfileId;

        // Mutation automatically invalidates profile queries via invalidateProfileMutationQueries
        await deleteProfile({ id });

        if (isActiveProfile && profiles) {
          // Only reset if we don't have any remaining profiles
          const remainingProfiles = profiles.filter(profile => String(profile.id) !== id);
          if (remainingProfiles.length === 0) {
            await profileStorage.resetDefaultProfile();
          } else {
            const deletedIndex = profiles.findIndex(profile => String(profile.id) === id);
            const newActiveProfile = remainingProfiles[deletedIndex] || remainingProfiles[deletedIndex - 1];
            if (newActiveProfile) {
              await updateActiveProfile({ activeProfileId: String(newActiveProfile.id) });
              setValue('defaultActiveProfileId', String(newActiveProfile.id));
            }
          }
        }

        toast({ title: 'Profile deleted successfully' });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to delete profile' });
      }
    },
    [deleteProfile, activeProfileId, profiles, updateActiveProfile, setValue],
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

  // ProfileForm mutations already invalidate queries via invalidateProfileMutationQueries
  const handleFormSubmit = useCallback(() => {
    setEditingId(undefined);
    profileModal.onFalse();
  }, [profileModal]);

  // Initialize default profile - auto-select first profile if none is active
  // Note: Only sets form value, does NOT trigger API mutation to avoid page refresh
  useEffect(() => {
    if (!activeProfile && profiles?.length) {
      // First try to find an active profile from API
      const activeFromApi = profiles.find(item => item.isActive);
      if (activeFromApi) {
        setValue('defaultActiveProfileId', String(activeFromApi.id));
        // Also set it in storage (no API call)
        profileStorage.setDefaultProfile(activeFromApi as unknown as DTOProfileFillingForm);
      } else {
        // If no active profile, just pre-select the first one in the form
        // The user will trigger the actual selection when they interact
        const firstProfile = profiles[0];
        if (firstProfile) {
          setValue('defaultActiveProfileId', String(firstProfile.id));
          profileStorage.setDefaultProfile(firstProfile as unknown as DTOProfileFillingForm);
        }
      }
    }
  }, [profiles, activeProfile, setValue]);

  // Add this useEffect to watch for changes in defaultStorageProfile
  useEffect(() => {
    if (activeProfile?.id) {
      setValue('defaultActiveProfileId', String(activeProfile.id));
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
    <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center">
      <FormProvider methods={methods}>
        <RHFShadcnComboBox
          placeholder="Select profile or create one"
          emptyPlaceholder="Create a new profile"
          disabled={isDisabled}
          loading={isLoaderVisible}
          options={profileOptions}
          onDelete={handleDeleteProfile}
          onEdit={handleEditProfile}
          onCreate={profileModal.onTrue}
          onChange={handleProfileChange}
          value={methods.watch('defaultActiveProfileId')}
          name="defaultActiveProfileId"
          className="filliny-w-full"
          title={''}
        />
      </FormProvider>

      <Drawer
        hideFooter
        open={profileModal.value}
        title={editingId ? 'Edit Profile' : 'New Profile'}
        onOpenChange={handleDrawerChange}>
        <div className="filliny-h-[70vh] filliny-overflow-y-auto">
          <ProfileForm id={editingId} onFormSubmit={handleFormSubmit} />
        </div>
      </Drawer>
    </div>
  );
};

export { ProfileSelector };
