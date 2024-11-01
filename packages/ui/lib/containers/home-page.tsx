import {
  getCurrentVistingUrl,
  getMatchingWebsite,
  isValidUrl,
  useAuthHealthCheckQuery,
  useAvailableAiModelsQuery,
  useEditFillingProfileMutation,
  useFillingProfileById,
  useStorage,
} from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Badge } from '../components';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils';
import { QuickAddWebsiteToProfile } from './quick-add-website';
import { ActiveProfileWebsitePreview } from './active-profile-website-preview';
import { PageLayout } from '../layout';

function HomePage() {
  const defaultProfile = useStorage(profileStrorage);
  const activeProfileId = useMemo(() => (defaultProfile ? String(defaultProfile?.id) : ''), [defaultProfile]);
  const { data: authHealthCheckData, isLoading: loadingAuthHealthCheck } = useAuthHealthCheckQuery();

  const {
    data: defaultActiveProfile,
    isLoading: isLoadingActiveProfile,
    isFetching: isFetchingActiveProfile,
  } = useFillingProfileById(activeProfileId);
  const { mutateAsync: editFillingProfileMutation, isPending: isUpdating } = useEditFillingProfileMutation();
  const {
    data: availableModels,
    isLoading: isLoadingModels,
    isFetching: isFetchingModels,
  } = useAvailableAiModelsQuery();
  const hasConfiggedAccessToken = useMemo(
    () => availableModels?.find(item => item.hasConfig)?.accessToken || '',
    [availableModels],
  );
  const { isLoading: isLoadingEditingItem, isFetching: isFetchingEditingItem } = useFillingProfileById(activeProfileId);

  const isLoading =
    isLoadingEditingItem ||
    isLoadingActiveProfile ||
    isFetchingActiveProfile ||
    isFetchingEditingItem ||
    isLoadingModels ||
    isFetchingModels;

  const [currentVisitingWebsiteUrl, setCurrentVisitingWebsiteUrl] = useState('');

  const isVisitingUrlValid = useMemo(() => isValidUrl(currentVisitingWebsiteUrl), [currentVisitingWebsiteUrl]);

  const matchingWebsite = useMemo(
    () =>
      defaultProfile && currentVisitingWebsiteUrl
        ? getMatchingWebsite(defaultProfile.fillingWebsites, currentVisitingWebsiteUrl)
        : null,
    [defaultProfile, currentVisitingWebsiteUrl],
  );

  const onQuickAdd = async () => {
    if (!defaultProfile) {
      return;
    }
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

      await editFillingProfileMutation(updatedProfileData);
    } catch (error) {
      console.log(error);
    }
  };

  const setVisitingUrl = async () => {
    try {
      const visitingUrl = (await getCurrentVistingUrl()) as string;
      if (visitingUrl && isValidUrl(visitingUrl)) {
        setCurrentVisitingWebsiteUrl(visitingUrl);
      } else {
        setCurrentVisitingWebsiteUrl('');
      }
    } catch (error) {
      console.error(error);
      setCurrentVisitingWebsiteUrl('');
    }
  };

  useEffect(() => {
    setVisitingUrl();
  }, []);

  useEffect(() => {
    profileStrorage.setDefaultProfile(defaultActiveProfile);
  }, [defaultActiveProfile]);

  return (
    <PageLayout>
      <div className="filliny-flex filliny-size-full filliny-flex-col filliny-gap-2">
        {!loadingAuthHealthCheck && !authHealthCheckData?.limitations.plan && (
          <div className="filliny-z-50 filliny-w-full">
            <Badge
              variant="outline"
              className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-1 filliny-bg-yellow-400 filliny-py-2 filliny-text-black">
              <span className="filliny-inline">
                {authHealthCheckData?.user.formFillingsCredit === 0
                  ? 'You have ran out of free form filling credits'
                  : `You have ${authHealthCheckData?.user.formFillingsCredit} free form filling credits left.`}
              </span>
              {authHealthCheckData?.user.formFillingsCredit === 0 && (
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
        )}
        {isLoading && (
          <div className="filliny-m-auto filliny-mt-44 filliny-flex filliny-size-full filliny-items-center filliny-justify-center">
            <Loader2 className={cn('size-30 filliny-animate-spin')} />
          </div>
        )}
        {!isLoading && !hasConfiggedAccessToken && (
          <Alert>
            <AlertTitle className="filliny-text-lg">Model config needed!</AlertTitle>
            <AlertDescription>
              {`Don't forget to pick and setup a default AI model config to fill forms with.`}{' '}
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !defaultProfile && (
          <Alert>
            <AlertTitle className="filliny-text-lg">Heads up!</AlertTitle>
            <AlertDescription>
              No active filling profiles found, start by clicking the plus button above to create your first profile
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && defaultProfile && isVisitingUrlValid && !matchingWebsite && (
          <QuickAddWebsiteToProfile
            isLoading={isUpdating}
            currentUrl={currentVisitingWebsiteUrl}
            onQuickAdd={onQuickAdd}
          />
        )}
        {!isLoading && defaultProfile && isVisitingUrlValid && matchingWebsite && (
          <ActiveProfileWebsitePreview
            matchingWebsite={{
              ...matchingWebsite,
              fillingContext: matchingWebsite.fillingContext || defaultProfile.defaultFillingContext,
            }}
            preferences={defaultProfile.preferences}
          />
        )}{' '}
        {!isLoading && !isVisitingUrlValid && (
          <>
            <Alert variant={'destructive'}>
              <AlertTitle className="filliny-text-lg">Error</AlertTitle>
              <AlertDescription>
                URL is not valid <br />
                detected URL: {currentVisitingWebsiteUrl}
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default HomePage;
// export default withErrorBoundary(withSuspense(HomePage, <div> Loading ... </div>), <div> Error Occur </div>);
