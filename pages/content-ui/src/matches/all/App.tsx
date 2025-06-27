import { useActiveTabUrl, useStorage } from "@extension/shared";
import { authStorage, profileStrorage } from "@extension/storage";
import { FillinyButton } from "@extension/ui";

export default function App() {
  const auth = useStorage(authStorage);
  const defaultStorageProfile = useStorage(profileStrorage);

  const { isLoading, matchingWebsite } = useActiveTabUrl({
    websites: defaultStorageProfile?.fillingWebsites,
    mode: "currentPage",
  });

  return (
    auth &&
    defaultStorageProfile &&
    !isLoading &&
    matchingWebsite && (
      <>
        <FillinyButton />
      </>
    )
  );
}
