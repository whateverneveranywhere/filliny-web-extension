import { useActiveTabUrl, useStorage } from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';

export default function App() {
  const defaultProfile = useStorage(profileStrorage);
  const {
    isLoading,
    isValid: isVisitingUrlValid,
    matchingWebsite,
  } = useActiveTabUrl({
    websites: defaultProfile?.fillingWebsites,
  });

  return (
    !isLoading &&
    defaultProfile &&
    isVisitingUrlValid &&
    matchingWebsite && (
      <>
        <FillinyButton />
      </>
    )
  );
}
