import { getMatchingWebsite, isValidUrl, useStorage } from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';
import { useEffect, useMemo, useState } from 'react';

// export default function App() {
//   useEffect(() => {
//     console.log('content ui loaded');
//   }, []);

//   return (
//     <div className="flex items-center justify-between gap-2 rounded bg-blue-100 px-2 py-1">
//       <div className="flex gap-1 text-blue-500">
//         Edit <strong className="text-blue-700">pages/content-ui/src/app.tsx</strong> and save to reload.
//       </div>
//       <Button onClick={exampleThemeStorage.toggle}>Toggle Theme</Button>
//     </div>
//   );
// }

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
