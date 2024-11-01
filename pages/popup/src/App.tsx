import { BackgroundActions, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { authStorage } from '@extension/storage';
import { RouterProvider, SigninPage } from '@extension/ui';
import { useEffect } from 'react';

const HomePage = () => {
  const auth = useStorage(authStorage);

  // In your React component
  useEffect(() => {
    chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, response => {
      if (response && response.success && response.success.token) {
        authStorage.setToken(response.success.token);
      } else {
        console.error('Failed to get auth token:', response);
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
