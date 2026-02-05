import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { ProfileForm } from './profile-form';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { Loading, NoTokensAlert, CreditsFooterWarning, EmptyProfileState, UpgradePrompt } from '../components';
import { Drawer } from '../components/drawer';
import { useToast } from '../hooks/use-toast';
import { PageLayout } from '../layout';
import {
  useExtensionAuth,
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useActiveTabUrl,
  useActiveProfile,
  usePlanLimits,
  useBoolean,
  notifyProfileUpdate,
  MessageType,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { useEffect, useMemo, useCallback } from 'react';
import type { DTOProfileFillingForm } from '@extension/storage';

const useProfileManagement = (url: string) => {
  const { toast } = useToast();
  const { activeProfile, activeProfileId, profiles } = useActiveProfile();

  const { mutateAsync: createProfile, isPending: isCreatingProfile } = useCreateFillingProfileMutation();
  const { mutateAsync: editProfile, isPending: isUpdating } = useEditFillingProfileMutation();

  const isLoading = isCreatingProfile || isUpdating;
  const hasNoProfiles = !profiles?.length;

  // Set the default profile in storage whenever it changes
  useEffect(() => {
    // Clear default profile if there are no profiles left
    if (!profiles?.length) {
      profileStorage.setDefaultProfile(undefined);
    } else if (activeProfile) {
      profileStorage.setDefaultProfile(activeProfile);
    }
  }, [activeProfile, profiles]);

  const { currentPlan, maxWebsites, hasReachedWebsiteLimit, isPro, freeFormsRemaining } = usePlanLimits();

  const handleCreateProfile = useCallback(async () => {
    const newProfileData: DTOProfileFillingForm = {
      profileName: 'My Profile',
      defaultFillingContext: 'Fill the form with professional, accurate information',
      preferences: {
        isFormal: true,
        isGapFillingAllowed: true,
        povId: 1,
        toneId: 1,
      },
      fillingWebsites: [{ fillingContext: '', isRootLoad: true, websiteUrl: url }],
    };

    const createdProfile = await createProfile({ data: newProfileData });
    await profileStorage.setDefaultProfile(createdProfile);
    // Notify content scripts about the profile update so they can show the UI
    await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
    toast({
      title: 'Profile created!',
      description: 'Your first profile is ready. Start filling forms with AI.',
    });
  }, [url, createProfile, toast]);

  const handleUpdateProfile = useCallback(async () => {
    if (!activeProfile) return;

    const updatedProfile: DTOProfileFillingForm = {
      ...activeProfile,
      fillingWebsites: [...activeProfile.fillingWebsites, { fillingContext: '', isRootLoad: true, websiteUrl: url }],
    };

    await editProfile({ id: activeProfileId, data: updatedProfile });
    // Update storage immediately so content scripts get the updated profile without waiting for query refetch
    await profileStorage.setDefaultProfile(updatedProfile);
    // Notify content scripts about the profile update so they can show the UI
    await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
    toast({
      title: 'Website added!',
      description: 'Filliny is now ready to help you fill forms on this site.',
    });
  }, [activeProfile, activeProfileId, url, editProfile, toast]);

  const handleQuickAdd = useCallback(async () => {
    if (hasReachedWebsiteLimit(activeProfile?.fillingWebsites?.length || 0)) return;

    try {
      if (!activeProfile || !profiles?.length) {
        await handleCreateProfile();
      } else {
        await handleUpdateProfile();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
      console.error('Error adding website:', error);
    }
  }, [activeProfile, profiles, hasReachedWebsiteLimit, handleCreateProfile, handleUpdateProfile, toast]);

  return {
    handleQuickAdd,
    activeProfile,
    profiles,
    isLoading,
    currentPlan,
    maxWebsites,
    hasReachedWebsiteLimit,
    hasNoProfiles,
    isPro,
    freeFormsRemaining,
  };
};

const HomePage = () => {
  const { isAuthenticated } = useExtensionAuth();
  const { isLoading: isLoadingOverview } = useDashboardOverview(isAuthenticated);
  const { activeProfile } = useActiveProfile();
  const { canFillForms, isPro, freeFormsRemaining, tokensRemaining } = usePlanLimits();
  const profileModal = useBoolean();
  const {
    activeTabUrl,
    isLoading: isLoadingUrl,
    isValid: isUrlValid,
    matchingWebsite,
  } = useActiveTabUrl({
    websites: activeProfile?.fillingWebsites,
    mode: 'activeTab',
  });

  const {
    handleQuickAdd,
    isLoading: isProfileLoading,
    currentPlan,
    maxWebsites,
    hasNoProfiles,
    isPro: isPlanPro,
  } = useProfileManagement(activeTabUrl);

  // Handle profile form submission
  const handleProfileFormSubmit = useCallback(() => {
    profileModal.onFalse();
  }, [profileModal]);

  // Footer with credit warnings - only show when user has some credits but running low
  const footerContent = useMemo(() => {
    // If user can fill forms, show the warning in footer when running low
    if (canFillForms) {
      return (
        <CreditsFooterWarning freeFormsRemaining={freeFormsRemaining} tokensRemaining={tokensRemaining} isPro={isPro} />
      );
    }
    return null;
  }, [canFillForms, freeFormsRemaining, tokensRemaining, isPro]);

  if (isLoadingUrl || isLoadingOverview || isProfileLoading) {
    return (
      <PageLayout>
        <Loading size="xl" className="filliny-min-h-[200px]" />
      </PageLayout>
    );
  }

  // Show empty state for new users with no profiles
  if (hasNoProfiles) {
    return (
      <PageLayout footer={footerContent}>
        <div className="filliny-flex filliny-flex-1 filliny-w-full filliny-flex-col filliny-gap-4">
          <EmptyProfileState
            onCreateProfile={profileModal.onTrue}
            onQuickStart={handleQuickAdd}
            isLoading={isProfileLoading}
            currentWebsiteUrl={activeTabUrl}
            isCurrentWebsiteValid={isUrlValid}
          />

          {/* Drawer for profile creation */}
          <Drawer hideFooter open={profileModal.value} title="Create Profile" onOpenChange={profileModal.setValue}>
            <ProfileForm onFormSubmit={handleProfileFormSubmit} />
          </Drawer>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout footer={footerContent}>
      <>
        <div className="filliny-flex filliny-flex-1 filliny-w-full filliny-flex-col filliny-gap-4">
          {isUrlValid ? (
            matchingWebsite && activeProfile ? (
              <ActiveProfileWebsitePreview
                matchingWebsite={{
                  ...matchingWebsite,
                  fillingContext: matchingWebsite.fillingContext || activeProfile?.defaultFillingContext,
                }}
                preferences={activeProfile?.preferences}
                profile={activeProfile}
              />
            ) : (
              <QuickAddWebsiteToProfile
                isLoading={isProfileLoading}
                onQuickAdd={handleQuickAdd}
                currentPlan={currentPlan}
                maxWebsites={maxWebsites}
                websitesCount={activeProfile?.fillingWebsites?.length || 0}
              />
            )
          ) : (
            <Loading variant="page" size="xl" message="Waiting for the page to fully load..." />
          )}

          {/* Token/Free Forms exhausted - warning at bottom */}
          {!canFillForms && <NoTokensAlert isPro={isPro} />}

          {/* Subtle upgrade prompt for free users who haven't hit limits yet */}
          {canFillForms && !isPlanPro && freeFormsRemaining <= 2 && freeFormsRemaining > 0 && (
            <UpgradePrompt reason="token-limit" variant="inline" />
          )}
        </div>
      </>
    </PageLayout>
  );
};

export default HomePage;
