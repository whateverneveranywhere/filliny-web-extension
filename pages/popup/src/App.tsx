import { BackgroundActions, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { authStorage } from '@extension/storage';
import { RouterProvider, SigninPage } from '@extension/ui';
import { useEffect } from 'react';

const HomePage = () => {
  const auth = useStorage(authStorage);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, response => {
      console.log('woooooooooo', response);

      authStorage.setToken(response.token || '');
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
