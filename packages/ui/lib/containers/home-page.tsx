import { useEffect, useMemo, useState } from 'react';
import {
  getConfig,
  getCurrentVistingUrl,
  getMatchingWebsite,
  isValidUrl,
  useAuthHealthCheckQuery,
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useFillingProfileById,
  useStorage,
} from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import { authStorage, profileStrorage } from '@extension/storage';
import { Alert, AlertDescription, AlertTitle, Loading, ToastAction } from '../components';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';
import { toast } from '../hooks/use-toast';

const HomePage = () => {
  const config = getConfig();
  const useVisitingUrl = () => {
    const [url, setUrl] = useState('');
    const isValid = useMemo(() => isValidUrl(url), [url]);

    useEffect(() => {
      const fetchUrl = async () => {
        try {
          const visitingUrl = await getCurrentVistingUrl();
          setUrl(visitingUrl && isValidUrl(visitingUrl) ? visitingUrl : '');
        } catch (error) {
          console.error('Error fetching URL:', error);
          setUrl('');
        }
      };
      fetchUrl();
    }, []);

    return { url, isValid };
  };

  const defaultProfile = useStorage(profileStrorage);
  const activeProfileId = useMemo(() => defaultProfile?.id?.toString() || '', [defaultProfile]);
  const { isLoading: loadingAuthHealthCheck, isError: healthCheckErrored } = useAuthHealthCheckQuery();
  const { data: dashboardOverview } = useDashboardOverview();

  const {
    data: defaultActiveProfile,
    isLoading: isLoadingActiveProfile,
    isFetching: isFetchingActiveProfile,
  } = useFillingProfileById(activeProfileId);

  const { mutateAsync: editFillingProfile, isPending: isUpdating } = useEditFillingProfileMutation();
  const { mutateAsync: createFillingProfile, isPending: isCreatingProfile } = useCreateFillingProfileMutation();
  const { isLoading: isLoadingEditingItem, isFetching: isFetchingEditingItem } = useFillingProfileById(activeProfileId);

  const { url: currentVisitingWebsiteUrl, isValid: isVisitingUrlValid } = useVisitingUrl();
  const isLoading = isLoadingEditingItem || isLoadingActiveProfile || isFetchingActiveProfile || isFetchingEditingItem;

  const matchingWebsite = useMemo(
    () =>
      defaultProfile && currentVisitingWebsiteUrl
        ? getMatchingWebsite(defaultProfile.fillingWebsites, currentVisitingWebsiteUrl)
        : null,
    [defaultProfile, currentVisitingWebsiteUrl],
  );

  const handleQuickAdd = async () => {
    try {
      if (!defaultProfile) {
        // No default profile exists, create a new one with example data
        const newProfileData: DTOProfileFillingForm = {
          profileName: 'Example Profile',
          defaultFillingContext: 'Fill the form with example test data',
          preferences: {
            isFormal: true,
            isGapFillingAllowed: true,
            povId: 1, // Ensure these are integers to align with backend expectations
            toneId: 1,
          },
          fillingWebsites: [
            {
              fillingContext: '',
              isRootLoad: true,
              websiteUrl: currentVisitingWebsiteUrl,
            },
          ],
        };
        const createdProfile = await createFillingProfile({ data: newProfileData });
        console.log('wooooooo', createdProfile);

        profileStrorage.setDefaultProfile(createdProfile); // Use returned profile to update state
        toast({ variant: 'default', title: 'Profile created and website added successfully' });
      } else {
        // Add the website to the existing profile
        const updatedProfileData = {
          id: activeProfileId,
          data: {
            ...defaultProfile,
            fillingWebsites: [
              ...defaultProfile.fillingWebsites,
              {
                fillingContext: '',
                isRootLoad: true,
                websiteUrl: currentVisitingWebsiteUrl,
              },
            ],
          },
        };
        await editFillingProfile(updatedProfileData);
        toast({ variant: 'default', title: 'Website added to profile successfully' });
      }
    } catch (error) {
      // Enhanced error handling
      const errorText = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (errorText.includes('maximum')) {
        toast({
          variant: 'destructive',
          title: errorText,
          action: (
            <ToastAction
              onClick={() => (window.location.href = `${config.baseURL}/pricing?tab=tokens`)}
              altText="Update plan">
              Upgrade plan
            </ToastAction>
          ),
        });
      }
      console.error('Error adding website:', error);
    }
  };

  useEffect(() => {
    profileStrorage.setDefaultProfile(defaultActiveProfile);
  }, [defaultActiveProfile]);

  useEffect(() => {
    if (healthCheckErrored) {
      authStorage.deleteToken();
    }
  }, [healthCheckErrored]);

  if (loadingAuthHealthCheck) {
    return <Loading />;
  }

  const hasNoAIToken = dashboardOverview?.remainingTokens === 0;

  const renderCreditsBadge = () => {
    if (hasNoAIToken && !defaultProfile) return null;

    return (
      hasNoAIToken && (
        <div className="filliny-w-full">
          <Alert variant="destructive">
            <AlertTitle>No AI Tokens</AlertTitle>
            <AlertDescription>
              <span className="filliny-inline">
                To obtain tokens, please visit our
                <a
                  href={config.baseURL + '/pricing?tab=tokens'}
                  target="_blank"
                  rel="noreferrer"
                  className="filliny-ml-1 filliny-underline">
                  pricing page
                </a>
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loading />;
    }

    if (!isVisitingUrlValid) {
      return (
        <Alert variant="destructive">
          <AlertTitle className="filliny-text-lg">Error</AlertTitle>
          <AlertDescription>
            URL is not valid <br />
            Detected URL: {currentVisitingWebsiteUrl}
          </AlertDescription>
        </Alert>
      );
    }

    if (matchingWebsite) {
      return (
        defaultProfile && (
          <ActiveProfileWebsitePreview
            matchingWebsite={{
              ...matchingWebsite,
              fillingContext: matchingWebsite.fillingContext || defaultProfile.defaultFillingContext,
            }}
            preferences={defaultProfile.preferences}
          />
        )
      );
    }

    return (
      <QuickAddWebsiteToProfile
        isLoading={isUpdating || isCreatingProfile}
        currentUrl={currentVisitingWebsiteUrl}
        onQuickAdd={handleQuickAdd}
      />
    );
  };

  return (
    <PageLayout>
      <div className="filliny-flex filliny-size-full filliny-flex-col filliny-gap-2">
        {renderCreditsBadge()}
        {renderContent()}
      </div>
    </PageLayout>
  );
};

export default HomePage;
