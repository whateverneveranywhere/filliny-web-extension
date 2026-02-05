import { Drawer } from '../components/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
  ScrollBar,
} from '../components/ui';
import { ProfileForm } from '../containers/profile-form';
import { toast } from '../hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useActiveProfile,
  useBoolean,
  useChangeActiveFillingProfileMutation,
  useDeleteProfileByIdMutation,
  useProfilesListQuery,
  notifyProfileUpdate,
  MessageType,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { Check, ChevronDown, ClipboardList, Edit, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { DTOFillingProfileItem, DTOProfileFillingForm } from '@extension/storage';

const ProfileSelector = () => {
  const profileModal = useBoolean();
  const unsavedChangesDialog = useBoolean();
  const deleteConfirmDialog = useBoolean();
  const [editingId, setEditingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const isFormDirtyRef = useRef(false);

  const { activeProfileId, activeProfile } = useActiveProfile();
  // Queries and Mutations
  const {
    data: profiles,
    isLoading,
    isFetching,
  } = useProfilesListQuery() as {
    data: DTOFillingProfileItem[] | undefined;
    isLoading: boolean;
    isFetching: boolean;
  };
  const { mutateAsync: deleteProfile, isPending: isDeleting } = useDeleteProfileByIdMutation();
  const { mutateAsync: updateActiveProfile, isPending: isUpdating } = useChangeActiveFillingProfileMutation();

  // Memoized handlers
  const handleProfileChange = useCallback(
    async (nextActiveId: string) => {
      if (!nextActiveId || nextActiveId === activeProfileId) return;

      try {
        await updateActiveProfile({ activeProfileId: nextActiveId });

        // Find the new active profile from the profiles list
        const newActiveProfile = profiles?.find(profile => String(profile.id) === nextActiveId);
        if (newActiveProfile) {
          await profileStorage.setDefaultProfile(newActiveProfile as unknown as DTOProfileFillingForm);
          // Notify content scripts about the profile update
          await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
        }

        toast({
          title: 'Profile switched',
          description: `Now using "${newActiveProfile?.name || 'selected profile'}"`,
        });
      } catch (error) {
        console.error('Failed to change profile:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unable to switch profile. Please try again.';
        toast({ variant: 'destructive', title: 'Error', description: errorMessage });
      }
    },
    [activeProfileId, profiles, updateActiveProfile],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId) return;

    try {
      const isActiveProfile = deletingId === activeProfileId;

      // Mutation automatically invalidates profile queries via invalidateProfileMutationQueries
      await deleteProfile({ id: deletingId });

      if (isActiveProfile && profiles) {
        // Only reset if we don't have any remaining profiles
        const remainingProfiles = profiles.filter(profile => String(profile.id) !== deletingId);
        if (remainingProfiles.length === 0) {
          await profileStorage.resetDefaultProfile();
          // Notify content scripts about the profile update (removal)
          await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
        } else {
          const deletedIndex = profiles.findIndex(profile => String(profile.id) === deletingId);
          const newActiveProfile = remainingProfiles[deletedIndex] || remainingProfiles[deletedIndex - 1];
          if (newActiveProfile) {
            await updateActiveProfile({ activeProfileId: String(newActiveProfile.id) });
            // Notify content scripts about the profile update
            await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
          }
        }
      }

      toast({ title: 'Profile deleted' });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to delete profile. Please try again.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setDeletingId(undefined);
      deleteConfirmDialog.onFalse();
    }
  }, [deleteProfile, deletingId, activeProfileId, profiles, updateActiveProfile, deleteConfirmDialog]);

  const handleDeleteClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingId(id);
      deleteConfirmDialog.onTrue();
    },
    [deleteConfirmDialog],
  );

  const handleEditProfile = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(id);
      profileModal.onTrue();
    },
    [profileModal],
  );

  const handleCreateProfile = useCallback(() => {
    setEditingId(undefined);
    profileModal.onTrue();
  }, [profileModal]);

  const handleFormDirtyChange = useCallback((isDirty: boolean) => {
    isFormDirtyRef.current = isDirty;
  }, []);

  const handleInterceptClose = useCallback(() => {
    if (isFormDirtyRef.current) {
      unsavedChangesDialog.onTrue();
      return false; // Prevent close
    }
    return true; // Allow close
  }, [unsavedChangesDialog]);

  const handleDiscardChanges = useCallback(() => {
    unsavedChangesDialog.onFalse();
    isFormDirtyRef.current = false;
    setEditingId(undefined);
    profileModal.onFalse();
  }, [unsavedChangesDialog, profileModal]);

  const handleKeepEditing = useCallback(() => {
    unsavedChangesDialog.onFalse();
  }, [unsavedChangesDialog]);

  const handleDrawerChange = useCallback(
    (isOpen: boolean) => {
      profileModal.setValue(isOpen);
      if (!isOpen) {
        isFormDirtyRef.current = false;
        setEditingId(undefined);
      }
    },
    [profileModal],
  );

  // ProfileForm mutations already invalidate queries via invalidateProfileMutationQueries
  const handleFormSubmit = useCallback(() => {
    isFormDirtyRef.current = false;
    setEditingId(undefined);
    profileModal.onFalse();
  }, [profileModal]);

  // UI States
  const isDisabled = isDeleting || isUpdating;
  const isLoaderVisible = isLoading || isFetching || isDeleting || isUpdating;
  const hasProfiles = profiles && profiles.length > 0;
  const profileToDelete = deletingId ? profiles?.find(p => String(p.id) === deletingId) : null;

  return (
    <div className="filliny-flex filliny-w-full filliny-min-w-0 filliny-items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isDisabled}
            className="filliny-w-full filliny-min-w-0 filliny-justify-between filliny-gap-2">
            <div className="filliny-flex filliny-min-w-0 filliny-items-center filliny-gap-2">
              {isLoaderVisible ? (
                <Loader2 className="filliny-size-4 filliny-shrink-0 filliny-animate-spin" />
              ) : (
                <ClipboardList className="filliny-size-4 filliny-shrink-0" />
              )}
              <span className="filliny-truncate">
                {activeProfile?.profileName || (hasProfiles ? 'Select profile' : 'Create profile')}
              </span>
            </div>
            <ChevronDown className="filliny-size-4 filliny-shrink-0 filliny-opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className="filliny-w-[calc(100vw-2rem)] filliny-max-w-[320px] filliny-min-w-[200px]">
          {hasProfiles && (
            <>
              <DropdownMenuLabel className="filliny-px-2 filliny-py-1.5 filliny-text-[10px] filliny-font-semibold filliny-uppercase filliny-tracking-wider filliny-text-muted-foreground">
                Profiles
              </DropdownMenuLabel>
              <ScrollArea className="filliny-max-h-[200px]">
                {profiles.map(profile => {
                  const profileId = String(profile.id);
                  const isActive = profileId === activeProfileId;

                  return (
                    <DropdownMenuItem
                      key={profileId}
                      className={cn(
                        'filliny-mx-0.5 filliny-my-0.5 filliny-flex filliny-cursor-pointer filliny-items-center filliny-justify-between filliny-gap-2 filliny-rounded-md filliny-px-2 filliny-py-1.5',
                        isActive && 'filliny-bg-accent/80',
                      )}
                      onSelect={() => handleProfileChange(profileId)}>
                      <div className="filliny-flex filliny-min-w-0 filliny-flex-1 filliny-items-center filliny-gap-2">
                        <div
                          className={cn(
                            'filliny-flex filliny-size-4 filliny-shrink-0 filliny-items-center filliny-justify-center filliny-rounded-full filliny-border',
                            isActive
                              ? 'filliny-border-primary filliny-bg-primary'
                              : 'filliny-border-muted-foreground/40 filliny-bg-transparent',
                          )}>
                          {isActive && <Check className="filliny-size-2.5 filliny-text-primary-foreground" />}
                        </div>
                        <span className="filliny-truncate filliny-text-sm">{profile.name}</span>
                      </div>
                      <div className="filliny-flex filliny-shrink-0 filliny-items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="filliny-size-6 filliny-rounded hover:filliny-bg-muted"
                          onClick={e => handleEditProfile(profileId, e)}>
                          <Edit className="filliny-size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="filliny-size-6 filliny-rounded hover:filliny-bg-destructive/10 hover:filliny-text-destructive"
                          onClick={e => handleDeleteClick(profileId, e)}>
                          <Trash2 className="filliny-size-3" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                <ScrollBar />
              </ScrollArea>
              <DropdownMenuSeparator className="filliny-my-1" />
            </>
          )}
          <DropdownMenuItem
            className="filliny-mx-0.5 filliny-mb-0.5 filliny-cursor-pointer filliny-gap-2 filliny-rounded-md filliny-bg-primary/10 filliny-px-2 filliny-py-2 filliny-font-medium filliny-text-primary hover:filliny-bg-primary/20"
            onSelect={handleCreateProfile}>
            <Plus className="filliny-size-4" />
            <span>Create new profile</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Drawer
        hideFooter
        open={profileModal.value}
        title={editingId ? 'Edit Profile' : 'Create Profile'}
        description={editingId ? undefined : 'Set up how Filliny fills forms for you'}
        onOpenChange={handleDrawerChange}
        onInterceptClose={handleInterceptClose}>
        <ProfileForm id={editingId} onFormSubmit={handleFormSubmit} onDirtyChange={handleFormDirtyChange} />
      </Drawer>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={unsavedChangesDialog.value} onOpenChange={unsavedChangesDialog.setValue}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmDialog.value} onOpenChange={deleteConfirmDialog.setValue}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{profileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={deleteConfirmDialog.onFalse}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="filliny-bg-destructive filliny-text-destructive-foreground hover:filliny-bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export { ProfileSelector };
