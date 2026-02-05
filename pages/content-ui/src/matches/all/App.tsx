import { useActiveTabUrl, useStorage, AppLifecycleMonitor, MessageType } from '@extension/shared';
import { authStorage, profileStorage } from '@extension/storage';
import { FillinyButton } from '@extension/ui';
import { useEffect, useState } from 'react';

const SHADOW_APP_ID = 'chrome-extension-filliny-all';

export default function App() {
  const auth = useStorage(authStorage);
  const defaultStorageProfile = useStorage(profileStorage);
  // Force re-render key to trigger profile re-evaluation when profile is updated via message
  const [, setForceUpdate] = useState(0);

  // Listen for profile update messages from the background script
  // This ensures we re-evaluate visibility when profiles change
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === MessageType.PROFILE_UPDATED) {
        // Force re-fetch from storage by triggering a state update
        // This ensures we get the latest profile data
        setForceUpdate(prev => prev + 1);
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
      <FillinyButton />
    </AppLifecycleMonitor>
  );
}
