import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  useBoolean,
  useChangeActiveFillingProfileMutation,
  useDeleteProfileByIdMutation,
  useFillingProfileById,
  useProfilesListQuery,
  useStorage,
} from '@extension/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';
import { profileStrorage } from '@extension/storage';
import { ProfileForm } from '@/lib/containers/profile-form';
import FormProvider from '../components/RHF/FormProvider';
import { RHFShadcnComboBox } from '../components/RHF';
import { Button } from '../components';
import { Drawer } from '../components/Drawer';

const schema = z.object({
  defaultActiveProfileId: z.string(),
});

function ProfileSelector() {
  const profileModal = useBoolean();
  const [editingId, setEditingId] = useState<string>();
  const defaultStorageProfile = useStorage(profileStrorage);

  // Queries and Mutations
  const { data: profiles, isLoading, isFetching, refetch: refetchProfiles } = useProfilesListQuery();
  const { mutateAsync: deleteProfile, isPending: isDeleting } = useDeleteProfileByIdMutation();
  const { mutateAsync: updateActiveProfile, isPending: isUpdating } = useChangeActiveFillingProfileMutation();

  // Active Profile Management
  const defaultActiveProfileId = useMemo(
    () => defaultStorageProfile?.id || profiles?.find(item => item.isActive)?.id,
    [profiles, defaultStorageProfile],
  );

  const methods = useForm({
    defaultValues: {
      defaultActiveProfileId: String(defaultActiveProfileId || ''),
    },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const { watch, setValue } = methods;
  const activeProfileId = watch('defaultActiveProfileId');
  const { data: activeProfile } = useFillingProfileById(activeProfileId);

  // Memoized handlers
  const handleProfileChange = useCallback(
    async (nextActiveId: string) => {
      if (nextActiveId === activeProfileId) return;

      try {
        await updateActiveProfile({ activeProfileId: nextActiveId });
        setValue('defaultActiveProfileId', nextActiveId);
        await profileStrorage.setDefaultProfile(activeProfile);
        toast({ title: 'Profile updated successfully' });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to update profile' });
      }
    },
    [activeProfileId, activeProfile, updateActiveProfile, setValue],
  );

  const handleDeleteProfile = useCallback(
    async (id: string) => {
      try {
        await deleteProfile({ id });
        await refetchProfiles();
        toast({ title: 'Profile deleted successfully' });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to delete profile' });
      }
    },
    [deleteProfile, refetchProfiles],
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
    if (!defaultStorageProfile && profiles?.length) {
      const activeFromApi = profiles.find(item => item.isActive);
      if (activeFromApi) {
        setValue('defaultActiveProfileId', String(activeFromApi.id));
      }
    }
  }, [profiles, defaultStorageProfile, setValue]);

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
          disabled={isDisabled}
          loading={isLoaderVisible}
          options={profileOptions}
          onDelete={handleDeleteProfile}
          onEdit={handleEditProfile}
          onChange={handleProfileChange}
          value={activeProfileId}
          name="defaultActiveProfileId"
          placeholder="Select or search profile"
          className="filliny-w-full"
          title={''}
        />
      </FormProvider>

      <Button variant="default" size="sm" onClick={profileModal.onTrue} className="filliny-h-9 filliny-w-9 filliny-p-0">
        <Plus className="filliny-h-4 filliny-w-4" />
      </Button>

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
}

export { ProfileSelector };
