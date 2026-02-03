import { useExtensionAuth } from '@extension/shared';
import { Loading, QueryClientProvider, RouterProvider, SigninPage, withPageWrapper } from '@extension/ui';

const HomePage = () => {
  const { isLoading, isAuthenticated } = useExtensionAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <QueryClientProvider>
      {isAuthenticated ? (
        <RouterProvider />
      ) : (
        <SigninPage />
      )}
    </QueryClientProvider>
  );
};

export default withPageWrapper(HomePage);
