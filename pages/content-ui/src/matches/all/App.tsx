import { useActiveTabUrl, useStorage, AppLifecycleMonitor, MessageType, useQuotaCheck } from '@extension/shared';
import { authStorage, profileStorage } from '@extension/storage';
import { FillinyButton, Toaster } from '@extension/ui';
import { useEffect } from 'react';

const SHADOW_APP_ID = 'chrome-extension-filliny-all';

export default function App() {
  const auth = useStorage(authStorage);
  const defaultStorageProfile = useStorage(profileStorage);
  const { canFillForms, disabledReason } = useQuotaCheck();
  // Listen for profile update messages from the background script
  // This ensures we re-evaluate visibility when profiles change
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === MessageType.PROFILE_UPDATED) {
        // Force re-read from chrome.storage so useSyncExternalStore picks up the change
        profileStorage.refresh();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
    return undefined;
  }, []);

  const { isLoading, matchingWebsite } = useActiveTabUrl({
    websites: defaultStorageProfile?.fillingWebsites,
    mode: 'currentPage',
  });

  // Determine if the extension UI should be visible
  const shouldBeVisible = Boolean(auth && defaultStorageProfile && !isLoading && matchingWebsite);

  return (
    <AppLifecycleMonitor shadowAppId={SHADOW_APP_ID} shouldBeVisible={shouldBeVisible}>
      <FillinyButton canFillForms={canFillForms} disabledReason={disabledReason} />
      <Toaster />
    </AppLifecycleMonitor>
  );
}
