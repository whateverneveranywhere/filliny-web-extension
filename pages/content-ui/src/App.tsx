import { useActiveTabUrl, useStorage } from '@extension/shared';
import { authStorage, profileStrorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';

export default function App() {
  const auth = useStorage(authStorage);
  const defaultProfile = useStorage(profileStrorage);
  const { isLoading, matchingWebsite } = useActiveTabUrl({
    websites: defaultProfile?.fillingWebsites,
    mode: 'currentPage',
  });

  return (
    auth &&
    !isLoading &&
    matchingWebsite && (
      <>
        <FillinyButton />
      </>
    )
  );
}
