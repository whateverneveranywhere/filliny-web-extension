/* eslint-disable react/no-unescaped-entities */
import { useEffect } from 'react';
import {
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useActiveTabUrl,
  useActiveProfile,
  usePlanLimits,
} from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';

import { Alert, AlertDescription, AlertTitle, Loading, NoTokensAlert } from '../components';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';
import { useToast } from '../hooks/use-toast';

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
      profileStrorage.setDefaultProfile(undefined);
    } else if (activeProfile) {
      profileStrorage.setDefaultProfile(activeProfile);
    }
  }, [activeProfile, profiles]);

  const { currentPlan, maxWebsites, hasReachedLimit } = usePlanLimits();

  const handleQuickAdd = async () => {
    if (hasReachedLimit(activeProfile?.fillingWebsites?.length || 0)) return;

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
    profileStrorage.setDefaultProfile(createdProfile);
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
    hasReachedLimit,
  };
};

const HomePage = () => {
  const { data: dashboardOverview, isLoading: isLoadingOverview } = useDashboardOverview();
  const { activeProfile } = useActiveProfile();
  const { url, isLoading: isLoadingUrl, isValid: isUrlValid, matchingWebsite } = useActiveTabUrl();
  const { handleQuickAdd, isLoading: isProfileLoading, currentPlan, maxWebsites } = useProfileManagement(url);

  if (isLoadingUrl || isLoadingOverview || isProfileLoading) {
    return (
      <PageLayout>
        <Loading size="xl" className="filliny-min-h-[200px]" />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <>
        <div className="filliny-flex filliny-min-h-[200px] filliny-w-full filliny-flex-col filliny-gap-4">
          {/* Token Status */}
          {dashboardOverview?.remainingTokens === 0 && <NoTokensAlert />}

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
            <Alert variant="destructive">
              <AlertTitle className="filliny-text-lg">Error</AlertTitle>
              <AlertDescription>
                URL is not valid <br />
                Detected URL: {url}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </>
    </PageLayout>
  );
};

export default HomePage;
