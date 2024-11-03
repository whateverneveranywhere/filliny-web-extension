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

import { Plus } from 'lucide-react';
import { profileStrorage } from '@extension/storage';
import { ProfileForm } from '@/lib/containers/profile-form';
import FormProvider from '../components/RHF/FormProvider';
import { RHFShadcnComboBox } from '../components/RHF';
import { Button } from '../components';
import { Drawer } from '../components/Drawer';

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
      defaultActiveProfileId: typeof defaultActiveProfileId === 'number' ? String(defaultActiveProfileId) : '',
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
    <div className="filliny-w-full">
      <div className="filliny-flex filliny-items-center filliny-justify-center filliny-gap-1">
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
        <Button onClick={isAddNewProfileModalOpen.onTrue} className="filliny-h-8 filliny-w-8 !filliny-p-2">
          <Plus className="filliny-h-3 filliny-w-3" />
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
          <div className="filliny-h-[70vh]">
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
    </div>
  );
}

export { ProfileSelector };
