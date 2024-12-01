import { BackgroundActions, clearUserStorage, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { authStorage } from '@extension/storage';
import { RouterProvider, SigninPage } from '@extension/ui';
import { useEffect } from 'react';

const HomePage = () => {
  const auth = useStorage(authStorage);

  useEffect(() => {
    // Initial auth check
    chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, response => {
      if (response && response.success && response.success.token) {
        authStorage.setToken(response.success.token);
      } else {
        clearUserStorage();
      }
    });

    // Listen for auth token changes
    chrome.runtime.onMessage.addListener(message => {
      if (message.action === BackgroundActions.AUTH_TOKEN_CHANGED) {
        const token = message.payload?.success?.token;
        if (token) {
          authStorage.setToken(token);
        } else {
          clearUserStorage();
        }
      }
    });
  }, []);

  return (
    <>
      {auth ? (
        <>
          <RouterProvider />
        </>
      ) : (
        <SigninPage />
      )}
    </>
  );
};

export default withErrorBoundary(withSuspense(HomePage, <div> Loading ... </div>), <div> Error Occur </div>);
