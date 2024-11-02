import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getCurrentVistingUrl,
  getMatchingWebsite,
  isValidUrl,
  useAuthHealthCheckQuery,
  useEditFillingProfileMutation,
  useFillingProfileById,
  useStorage,
} from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { Alert, AlertDescription, AlertTitle, Badge } from '../components';
import { cn } from '../utils';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';

const HomePage = () => {
  // Custom hook to handle URL state and validation
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

  // Profile and auth state management
  const defaultProfile = useStorage(profileStrorage);
  const activeProfileId = useMemo(() => defaultProfile?.id?.toString() || '', [defaultProfile]);
  const { data: authHealthCheckData, isLoading: loadingAuthHealthCheck } = useAuthHealthCheckQuery();

  // Profile data fetching
  const {
    data: defaultActiveProfile,
    isLoading: isLoadingActiveProfile,
    isFetching: isFetchingActiveProfile,
  } = useFillingProfileById(activeProfileId);

  const { mutateAsync: editFillingProfile, isPending: isUpdating } = useEditFillingProfileMutation();
  const { isLoading: isLoadingEditingItem, isFetching: isFetchingEditingItem } = useFillingProfileById(activeProfileId);

  // URL handling
  const { url: currentVisitingWebsiteUrl, isValid: isVisitingUrlValid } = useVisitingUrl();

  // Derived state
  const isLoading = isLoadingEditingItem || isLoadingActiveProfile || isFetchingActiveProfile || isFetchingEditingItem;

  const matchingWebsite = useMemo(
    () =>
      defaultProfile && currentVisitingWebsiteUrl
        ? getMatchingWebsite(defaultProfile.fillingWebsites, currentVisitingWebsiteUrl)
        : null,
    [defaultProfile, currentVisitingWebsiteUrl],
  );

  // Event handlers
  const handleQuickAdd = async () => {
    if (!defaultProfile) return;

    try {
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
    } catch (error) {
      console.error('Error adding website:', error);
    }
  };

  // Side effects
  useEffect(() => {
    profileStrorage.setDefaultProfile(defaultActiveProfile);
  }, [defaultActiveProfile]);

  // Render helpers
  const renderCreditsBadge = () => {
    if (loadingAuthHealthCheck || authHealthCheckData?.limitations.plan) return null;

    const { formFillingsCredit } = authHealthCheckData?.user || {};
    const hasNoCredits = formFillingsCredit === 0;

    return (
      <div className="filliny-z-50 filliny-w-full">
        <Badge
          variant="outline"
          className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-1 filliny-bg-yellow-400 filliny-py-2 filliny-text-black">
          <span className="filliny-inline">
            {hasNoCredits
              ? 'You have ran out of free form filling credits'
              : `You have ${formFillingsCredit} free form filling credits left.`}
          </span>
          {hasNoCredits && (
            <span className="filliny-inline">
              To upgrade your plan, visit
              <a
                href="https://filliny.io/plans"
                target="_blank"
                rel="noreferrer"
                className="filliny-ml-1 filliny-underline">
                Filliny plans
              </a>
              .
            </span>
          )}
        </Badge>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="filliny-m-auto filliny-mt-44 filliny-flex filliny-size-full filliny-items-center filliny-justify-center">
          <Loader2 className={cn('size-30 filliny-animate-spin')} />
        </div>
      );
    }

    if (!defaultProfile) {
      return (
        <Alert>
          <AlertTitle className="filliny-text-lg">Heads up!</AlertTitle>
          <AlertDescription>
            No active filling profiles found, start by clicking the plus button above to create your first profile
          </AlertDescription>
        </Alert>
      );
    }

    if (!isVisitingUrlValid) {
      return (
        <Alert variant="destructive">
          <AlertTitle className="filliny-text-lg">Error</AlertTitle>
          <AlertDescription>
            URL is not valid <br />
            detected URL: {currentVisitingWebsiteUrl}
          </AlertDescription>
        </Alert>
      );
    }

    if (matchingWebsite) {
      return (
        <ActiveProfileWebsitePreview
          matchingWebsite={{
            ...matchingWebsite,
            fillingContext: matchingWebsite.fillingContext || defaultProfile.defaultFillingContext,
          }}
          preferences={defaultProfile.preferences}
        />
      );
    }

    return (
      <QuickAddWebsiteToProfile
        isLoading={isUpdating}
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
