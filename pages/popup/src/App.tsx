import { useExtensionAuth, getConfig, WebappEnvs } from '@extension/shared';
import { Loading, QueryClientProvider, RouterProvider, SigninPage, withPageWrapper } from '@extension/ui';
import { useEffect, useState } from 'react';

// Define the type for the config
interface ConfigInfo {
  env: string;
  baseURL: string;
  cookieName: string;
}

const HomePage = () => {
  const { isLoading, isAuthenticated } = useExtensionAuth();
  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null);

  useEffect(() => {
    // Get configuration on component mount
    try {
      const config = getConfig();
      // Determine which environment is being used by comparing baseURL
      let currentEnv = 'unknown';

      if (config.baseURL === 'http://localhost:5173') {
        currentEnv = WebappEnvs.DEV;
      } else if (config.baseURL === 'https://dev.filliny-app.pages.dev') {
        currentEnv = WebappEnvs.PREVIEW;
      } else if (config.baseURL === 'https://filliny.io') {
        currentEnv = WebappEnvs.PROD;
      }

      setConfigInfo({
        env: currentEnv,
        baseURL: config.baseURL,
        cookieName: config.cookieName,
      });
    } catch (error) {
      console.error('Error getting configuration:', error);
    }
  }, []);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="filliny-min-h-[300px] filliny-w-[350px] filliny-p-4">
      <h1 className="filliny-mb-4 filliny-text-xl filliny-font-bold">Filliny</h1>

      {/* Debug info */}
      <div className="filliny-mt-4 filliny-rounded-md filliny-bg-muted filliny-p-2 filliny-text-sm">
        <h2 className="filliny-mb-2 filliny-font-semibold">Environment Configuration:</h2>
        {configInfo ? (
          <ul className="filliny-space-y-1">
            <li>
              <span className="filliny-font-medium">Environment:</span> {configInfo.env}
            </li>
            <li>
              <span className="filliny-font-medium">Base URL:</span> {configInfo.baseURL}
            </li>
            <li>
              <span className="filliny-font-medium">Cookie Name:</span> {configInfo.cookieName}
            </li>
          </ul>
        ) : (
          <p>Loading configuration...</p>
        )}
      </div>

      {/* Rest of your app */}
      <div className="filliny-mt-4">
        <QueryClientProvider>
          {isAuthenticated ? (
            <RouterProvider />
          ) : (
            <SigninPage />
          )}
        </QueryClientProvider>
      </div>
    </div>
  );
};

export default withPageWrapper(HomePage);
