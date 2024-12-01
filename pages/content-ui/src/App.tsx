import { useActiveTabUrl, useStorage } from '@extension/shared';
import { authStorage, profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';

export default function App() {
  const auth = useStorage(authStorage);
  const defaultProfile = useStorage(profileStrorage);
  const {
    isLoading,
    isValid: isVisitingUrlValid,
    matchingWebsite,
  } = useActiveTabUrl({
    websites: defaultProfile?.fillingWebsites,
  });

  return (
    auth &&
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
