import { useExtensionAuth, useStorage } from '@extension/shared';
import { authStorage } from '@extension/storage';
import { Loading, QueryClientProvider, RouterProvider, SigninPage, withPageWrapper } from '@extension/ui';

const HomePage = () => {
  const auth = useStorage(authStorage);
  const { isLoading } = useExtensionAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <QueryClientProvider>
      {auth ? (
        <>
          <RouterProvider />
        </>
      ) : (
        <SigninPage />
      )}
    </QueryClientProvider>
  );
};

export default withPageWrapper(HomePage);
