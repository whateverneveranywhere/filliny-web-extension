import { useStorage, useActiveTabUrl } from '@extension/shared';
import { profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';

export default function App() {
  const defaultProfile = useStorage(profileStrorage);
  const { isLoading, isValid, matchingWebsite } = useActiveTabUrl({
    websites: defaultProfile?.fillingWebsites,
  });

  return (
    !isLoading &&
    defaultProfile &&
    isValid &&
    matchingWebsite && (
      <>
        <FillinyButton />
      </>
    )
  );
}
