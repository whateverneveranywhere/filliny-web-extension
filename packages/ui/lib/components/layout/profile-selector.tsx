import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  useBoolean,
  useChangeActiveFillingProfileMutation,
  useDeleteProfileByIdMutation,
  useFillingProfileById,
  useProfilesListQuery,
} from '@extension/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/hooks/use-toast';
import { RHFShadcnComboBox } from '../RHF';
import FormProvider from '../RHF/FormProvider';
import { Button } from '../ui';
import { Plus } from 'lucide-react';
import { ProfileForm } from '@/lib/containers/profile-form';
import { Drawer } from '../Drawer';
import { profileStrorage } from '@extension/storage';

export const schema = z.object({
  defaultActiveProfileId: z.string(),
});

function ProfileSelector() {
  const isAddNewProfileModalOpen = useBoolean();
  const {
    data: profilesList,
    isLoading: isLoadingProfilesList,
    isFetching: isFetchingProfilesList,
    refetch: refetchProfilesList,
  } = useProfilesListQuery();

  const { mutateAsync: deleteProfileById, isPending: isDeleting } = useDeleteProfileByIdMutation();
  const { mutateAsync: updateActiveProfile, isPending: isUpdatingDefault } = useChangeActiveFillingProfileMutation();
  const [editingTempId, setEditingTempId] = useState<string | undefined>(undefined);

  const defaultActiveProfileId = useMemo(() => profilesList?.find(item => item.isActive)?.id, [profilesList]);

  const methods = useForm<{ defaultActiveProfileId: string }>({
    values: {
      defaultActiveProfileId: defaultActiveProfileId ? String(defaultActiveProfileId) : '',
    },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const { watch, handleSubmit, setValue } = methods;
  const activeProfileId = watch('defaultActiveProfileId');

  const { data: activeProfileData } = useFillingProfileById(activeProfileId);

  const handleProfileChange = async (nextActiveId: string) => {
    if (nextActiveId === activeProfileId) return;

    try {
      await updateActiveProfile({ activeProfileId: nextActiveId });
      setValue('defaultActiveProfileId', nextActiveId);
      toast({ variant: 'default', title: 'Default active profile changed!' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error changing default profile!' });
    }
  };

  const onSubmit = handleSubmit(async formData => {
    console.log(formData);
  });

  useEffect(() => {
    if (activeProfileData && profilesList?.length) {
      profileStrorage.setDefaultProfile(activeProfileData);
    } else {
      profileStrorage.setDefaultProfile(undefined);
    }
  }, [activeProfileData, profilesList]);

  return (
    <>
      <div className="-mt-1 flex items-center justify-center">
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <RHFShadcnComboBox
            disabled={isDeleting || isUpdatingDefault}
            loading={isLoadingProfilesList || isFetchingProfilesList || isDeleting || isUpdatingDefault}
            onDelete={async id => {
              await deleteProfileById({ id });
              await refetchProfilesList();
            }}
            onEdit={id => {
              setEditingTempId(id);
              isAddNewProfileModalOpen.onTrue();
            }}
            options={
              profilesList?.map(item => ({
                label: item.name,
                value: String(item.id),
              })) || []
            }
            onChange={handleProfileChange}
            value={activeProfileId}
            name="defaultActiveProfileId"
            placeholder="Search by profile name"
            title={''}
          />
        </FormProvider>
        <Button size="icon" onClick={isAddNewProfileModalOpen.onTrue}>
          <Plus />
        </Button>
      </div>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Drawer
          hideFooter
          onOpenChange={isOpen => {
            isAddNewProfileModalOpen.setValue(isOpen);
            if (!isOpen) setEditingTempId(undefined);
          }}
          open={isAddNewProfileModalOpen.value}
          title={editingTempId ? 'Edit profile form' : 'New profile form'}
          onConfirm={onSubmit}>
          <div className="h-[70vh]">
            <ProfileForm
              id={editingTempId}
              onFormSubmit={() => {
                setEditingTempId(undefined);
                isAddNewProfileModalOpen.onFalse();
                refetchProfilesList();
              }}
            />
          </div>
        </Drawer>
      </FormProvider>
    </>
  );
}

export { ProfileSelector };
