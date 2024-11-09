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

// import { useEffect } from 'react';
// import { exampleThemeStorage } from '@extension/storage';
// import { Button } from '@extension/ui';

// export default function App() {
//   useEffect(() => {
//     console.log('content ui loaded');
//   }, []);

//   return (
//     <div className="filliny-flex filliny-items-center filliny-justify-between filliny-gap-2 filliny-rounded filliny-bg-blue-100 filliny-px-2 filliny-py-1">
//       <div className="filliny-flex filliny-gap-1 filliny-text-blue-500">
//         Edit <strong className="filliny-text-blue-700">pages/content-ui/src/app.tsx</strong> and save to reload.
//       </div>
//       <Button variant={'destructive'} onClick={exampleThemeStorage.toggle}>
//         Toggle Theme
//       </Button>
//     </div>
//   );
// }
