import { getMatchingWebsite, isValidUrl, useStorage } from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';
import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const defaultProfile = useStorage(profileStrorage);
  const [currentVisitingWebsiteUrl, setCurrentVisitingWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isVisitingUrlValid = useMemo(() => isValidUrl(currentVisitingWebsiteUrl), [currentVisitingWebsiteUrl]);

  const matchingWebsite = useMemo(
    () =>
      defaultProfile && currentVisitingWebsiteUrl
        ? getMatchingWebsite(defaultProfile.fillingWebsites, currentVisitingWebsiteUrl)
        : null,
    [defaultProfile, currentVisitingWebsiteUrl],
  );

  const setVisitingUrl = async () => {
    try {
      const visitingUrl = window.location.href as string;
      if (visitingUrl && isValidUrl(visitingUrl)) {
        setCurrentVisitingWebsiteUrl(visitingUrl);
      } else {
        setCurrentVisitingWebsiteUrl('');
      }
    } catch (error) {
      console.error(error);
      setCurrentVisitingWebsiteUrl('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setVisitingUrl();
  }, []);

  useEffect(() => {
    console.log('content ui loaded');
  }, []);

  return (
    !isLoading &&
    defaultProfile &&
    isVisitingUrlValid &&
    matchingWebsite && (
      <>
        <FillinyButton />;
      </>
    )
  );
}
