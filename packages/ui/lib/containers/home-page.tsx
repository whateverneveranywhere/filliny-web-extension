/* eslint-disable react/no-unescaped-entities */
import { useEffect, useMemo } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import {
  getConfig,
  getMatchingWebsite,
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useStorage,
  useProfilesListQuery,
  useFillingProfileById,
  useActiveTabUrl,
} from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';

import { Alert, AlertDescription, AlertTitle, Button, Loading } from '../components';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';
import { useToast } from '../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const useProfileManagement = (url: string) => {
  const { toast } = useToast();
  const config = getConfig();
  const queryClient = useQueryClient();

  // Get the default profile from storage
  const defaultStorageProfile = useStorage(profileStrorage);

  // Get profiles list to find active profile
  const { data: profiles } = useProfilesListQuery();
  const activeProfileId = useMemo(
    () => defaultStorageProfile?.id?.toString() || profiles?.find(item => item.isActive)?.id?.toString() || '',
    [profiles, defaultStorageProfile],
  );

  // Use the active profile ID to get the full profile data
  const { data: defaultProfile } = useFillingProfileById(activeProfileId);

  const { mutateAsync: createProfile, isPending: isCreatingProfile } = useCreateFillingProfileMutation();
  const { mutateAsync: editProfile, isPending: isUpdating } = useEditFillingProfileMutation();

  const isLoading = isCreatingProfile || isUpdating;

  // Set the default profile in storage whenever it changes
  useEffect(() => {
    if (defaultProfile && profiles?.length) {
      profileStrorage.setDefaultProfile(defaultProfile);
    }
  }, [defaultProfile, profiles]);

  const handleQuickAdd = async () => {
    try {
      if (!defaultProfile) {
        await handleCreateProfile();
      } else {
        await handleUpdateProfile();
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleCreateProfile = async () => {
    const newProfileData: DTOProfileFillingForm = {
      profileName: 'First Profile',
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
    await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    await queryClient.invalidateQueries({ queryKey: ['activeProfile'] });
    toast({ title: 'Profile created and set as default' });
  };

  const handleUpdateProfile = async () => {
    if (!defaultProfile) return;

    const updatedProfileData = {
      id: activeProfileId,
      data: {
        ...defaultProfile,
        fillingWebsites: [...defaultProfile.fillingWebsites, { fillingContext: '', isRootLoad: true, websiteUrl: url }],
      },
    };

    await editProfile(updatedProfileData);
    toast({ title: 'Website added to profile successfully' });
  };

  const handleError = (error: unknown) => {
    const errorText = error instanceof Error ? error.message : 'An unexpected error occurred';

    if (errorText.includes('maximum')) {
      toast({
        variant: 'destructive',
        title: 'Token Limit Reached',
        description: (
          <div className="filliny-flex filliny-items-center filliny-gap-2">
            <span>You've reached your token limit.</span>
            <Button
              variant="link"
              className="filliny-h-auto filliny-p-0"
              onClick={() => window.open(`${config.baseURL}/pricing?tab=tokens`, '_blank')}>
              Upgrade Plan <ExternalLink className="filliny-ml-1 filliny-h-4 filliny-w-4" />
            </Button>
          </div>
        ),
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: errorText });
    }
    console.error('Error adding website:', error);
  };

  return {
    handleQuickAdd,
    defaultProfile,
    activeProfileId,
    isLoading,
  };
};

const HomePage = () => {
  const { data: dashboardOverview, isLoading: isLoadingOverview } = useDashboardOverview();
  const { url, isLoading: isLoadingUrl, isValid: isUrlValid } = useActiveTabUrl();
  const { handleQuickAdd, defaultProfile, activeProfileId, isLoading: isProfileLoading } = useProfileManagement(url);

  const matchingWebsite = useMemo(
    () => (defaultProfile && url ? getMatchingWebsite(defaultProfile.fillingWebsites, url) : null),
    [defaultProfile, url, activeProfileId],
  );

  if (isLoadingUrl || isLoadingOverview || isProfileLoading) {
    return (
      <PageLayout>
        <Loading className="filliny-min-h-[200px]" />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="filliny-flex filliny-min-h-[200px] filliny-w-full filliny-flex-col filliny-gap-4">
        {/* Token Status */}
        {dashboardOverview?.remainingTokens === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="filliny-h-4 filliny-w-4" />
            <AlertTitle>Low Token Balance</AlertTitle>
            <AlertDescription className="filliny-flex filliny-items-center filliny-gap-2">
              Purchase more tokens to continue using AI features.
              <Button
                variant="link"
                className="filliny-h-auto filliny-p-0"
                onClick={() => window.open(`${getConfig().baseURL}/pricing?tab=tokens`, '_blank')}>
                Buy Tokens <ExternalLink className="filliny-ml-1 filliny-h-4 filliny-w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {isUrlValid ? (
          matchingWebsite && defaultProfile ? (
            <ActiveProfileWebsitePreview
              matchingWebsite={{
                ...matchingWebsite,
                fillingContext: matchingWebsite.fillingContext || defaultProfile?.defaultFillingContext,
              }}
              preferences={defaultProfile?.preferences}
            />
          ) : (
            <QuickAddWebsiteToProfile isLoading={isProfileLoading} onQuickAdd={handleQuickAdd} />
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
    </PageLayout>
  );
};

export default HomePage;
