import { useEffect, useMemo, useState } from 'react';
import {
  getConfig,
  getCurrentVistingUrl,
  getMatchingWebsite,
  isValidUrl,
  useDashboardOverview,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useStorage,
} from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import { Alert, AlertDescription, AlertTitle, Loading, ToastAction } from '../components';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';
import { toast } from '../hooks/use-toast';

const HomePage = () => {
  const config = getConfig();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const defaultProfile = useStorage(profileStrorage);
  const activeProfileId = useMemo(() => defaultProfile?.id?.toString() || '', [defaultProfile]);

  const { data: dashboardOverview, isLoading: isLoadingOverview } = useDashboardOverview();

  const { mutateAsync: createFillingProfile, isPending: isCreatingProfile } = useCreateFillingProfileMutation();
  const { mutateAsync: editFillingProfile, isPending: isUpdating } = useEditFillingProfileMutation();

  const hasNoAIToken = dashboardOverview?.remainingTokens === 0;

  const isAllLoading = isLoadingOverview || isCreatingProfile || isUpdating;

  // Fetch current visiting URL once on load
  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const visitingUrl = await getCurrentVistingUrl();
        setUrl(isValidUrl(visitingUrl) ? visitingUrl : '');
      } catch (error) {
        console.error('Error fetching URL:', error);
        setUrl('');
      }
    };
    fetchUrl();
  }, []);

  // Memoize derived values
  const isVisitingUrlValid = useMemo(() => isValidUrl(url), [url]);
  const matchingWebsite = useMemo(
    () => (defaultProfile && url ? getMatchingWebsite(defaultProfile.fillingWebsites, url) : null),
    [defaultProfile, url],
  );

  // Only render content if loading is complete
  useEffect(() => {
    if (!isAllLoading) setIsLoading(false);
  }, [isAllLoading]);

  const handleQuickAdd = async () => {
    try {
      if (!defaultProfile) {
        const newProfileData: DTOProfileFillingForm = {
          profileName: 'First Profile',
          defaultFillingContext: 'Fill the form with example mock data',
          preferences: {
            isFormal: true,
            isGapFillingAllowed: true,
            povId: 1,
            toneId: 1,
          },
          fillingWebsites: [
            {
              fillingContext: '',
              isRootLoad: true,
              websiteUrl: url,
            },
          ],
        };
        const createdProfile = await createFillingProfile({ data: newProfileData });
        profileStrorage.setDefaultProfile(createdProfile);
        toast({ variant: 'default', title: 'Profile created and website added successfully' });
      } else {
        const updatedProfileData = {
          id: activeProfileId,
          data: {
            ...defaultProfile,
            fillingWebsites: [
              ...defaultProfile.fillingWebsites,
              { fillingContext: '', isRootLoad: true, websiteUrl: url },
            ],
          },
        };
        await editFillingProfile(updatedProfileData);
        toast({ variant: 'default', title: 'Website added to profile successfully' });
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (errorText.includes('maximum')) {
        toast({
          variant: 'destructive',
          title: errorText,
          action: (
            <ToastAction
              onClick={() => (window.location.href = `${config.baseURL}/pricing?tab=tokens`)}
              altText="Upgrade plan">
              Upgrade plan
            </ToastAction>
          ),
        });
      }
      console.error('Error adding website:', error);
    }
  };

  const renderCreditsBadge = () =>
    hasNoAIToken && !defaultProfile
      ? null
      : hasNoAIToken && (
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
        );

  const renderContent = () => {
    if (isLoading) return <Loading />;
    if (!isVisitingUrlValid) {
      return (
        <Alert variant="destructive">
          <AlertTitle className="filliny-text-lg">Error</AlertTitle>
          <AlertDescription>
            URL is not valid <br />
            Detected URL: {url}
          </AlertDescription>
        </Alert>
      );
    }
    return matchingWebsite && defaultProfile ? (
      <ActiveProfileWebsitePreview
        matchingWebsite={{
          ...matchingWebsite,
          fillingContext: matchingWebsite.fillingContext || defaultProfile?.defaultFillingContext,
        }}
        preferences={defaultProfile?.preferences}
      />
    ) : (
      <QuickAddWebsiteToProfile
        isLoading={isUpdating || isCreatingProfile}
        currentUrl={url}
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
