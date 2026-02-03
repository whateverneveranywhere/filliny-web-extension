import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { Loading, NoTokensAlert, CreditsFooterWarning } from '../components';
import { useToast } from '../hooks/use-toast';
import { PageLayout } from '../layout';
import {
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useActiveTabUrl,
  useActiveProfile,
  usePlanLimits,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { useEffect, useMemo } from 'react';
import type { DTOProfileFillingForm } from '@extension/storage';

const useProfileManagement = (url: string) => {
  const { toast } = useToast();
  const { activeProfile, activeProfileId, profiles } = useActiveProfile();

  const { mutateAsync: createProfile, isPending: isCreatingProfile } = useCreateFillingProfileMutation();
  const { mutateAsync: editProfile, isPending: isUpdating } = useEditFillingProfileMutation();

  const isLoading = isCreatingProfile || isUpdating;

  // Set the default profile in storage whenever it changes
  useEffect(() => {
    // Clear default profile if there are no profiles left
    if (!profiles?.length) {
      profileStorage.setDefaultProfile(undefined);
    } else if (activeProfile) {
      profileStorage.setDefaultProfile(activeProfile);
    }
  }, [activeProfile, profiles]);

  const { currentPlan, maxWebsites, hasReachedWebsiteLimit } = usePlanLimits();

  const handleQuickAdd = async () => {
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
  };

  const handleCreateProfile = async () => {
    const newProfileData: DTOProfileFillingForm = {
      profileName: 'First profile',
      defaultFillingContext: 'Fill the form with example mock data',
      preferences: {
        isFormal: true,
        isGapFillingAllowed: true,
        povId: 1,
        toneId: 1,
      },
      fillingWebsites: [{ fillingContext: '', isRootLoad: true, websiteUrl: url }],
    };

    const createdProfile = await createProfile({ data: newProfileData });
    profileStorage.setDefaultProfile(createdProfile);
    toast({ title: 'Profile created and set as default' });
  };

  const handleUpdateProfile = async () => {
    if (!activeProfile) return;

    const updatedProfileData = {
      id: activeProfileId,
      data: {
        ...activeProfile,
        fillingWebsites: [...activeProfile.fillingWebsites, { fillingContext: '', isRootLoad: true, websiteUrl: url }],
      },
    };

    await editProfile(updatedProfileData);
    toast({ title: 'Website added to profile successfully' });
  };

  return {
    handleQuickAdd,
    activeProfile,
    isLoading,
    currentPlan,
    maxWebsites,
    hasReachedWebsiteLimit,
  };
};

const HomePage = () => {
  const { isLoading: isLoadingOverview } = useDashboardOverview();
  const { activeProfile } = useActiveProfile();
  const { canFillForms, isPro, freeFormsRemaining, tokensRemaining } = usePlanLimits();
  const {
    activeTabUrl,
    isLoading: isLoadingUrl,
    isValid: isUrlValid,
    matchingWebsite,
  } = useActiveTabUrl({
    websites: activeProfile?.fillingWebsites,
    mode: 'activeTab',
  });

  const { handleQuickAdd, isLoading: isProfileLoading, currentPlan, maxWebsites } = useProfileManagement(activeTabUrl);

  // Footer with credit warnings - only show when user has some credits but running low
  const footerContent = useMemo(() => {
    // If user can fill forms, show the warning in footer when running low
    if (canFillForms) {
      return (
        <CreditsFooterWarning
          freeFormsRemaining={freeFormsRemaining}
          tokensRemaining={tokensRemaining}
          isPro={isPro}
        />
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
        </div>
      </>
    </PageLayout>
  );
};

export default HomePage;
