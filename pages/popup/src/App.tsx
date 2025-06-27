import {
  BackgroundActions,
  useStorage,
  withErrorBoundary,
  withSuspense,
  getConfig,
  WebappEnvs,
} from "@extension/shared";
import { authStorage } from "@extension/storage";
import { ErrorDisplay, LoadingSpinner, RouterProvider, SigninPage } from "@extension/ui";
import { useEffect, useState } from "react";

// Define the type for the config
interface ConfigInfo {
  env: string;
  baseURL: string;
  cookieName: string;
}

const HomePage = () => {
  const auth = useStorage(authStorage);
  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null);

  // In your React component
  useEffect(() => {
    chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, response => {
      if (response && response.success && response.success.token) {
        authStorage.setToken(response.success.token);
      } else {
        console.error("Failed to get auth token:", response);
      }
    });

    // Get configuration on component mount
    try {
      const config = getConfig();
      // Determine which environment is being used by comparing baseURL
      let currentEnv = "unknown";

      if (config.baseURL === "http://localhost:3000") {
        currentEnv = WebappEnvs.DEV;
      } else if (config.baseURL === "https://dev.filliny-app.pages.dev") {
        currentEnv = WebappEnvs.PREVIEW;
      } else if (config.baseURL === "https://filliny.io") {
        currentEnv = WebappEnvs.PROD;
      }

      setConfigInfo({
        env: currentEnv,
        baseURL: config.baseURL,
        cookieName: config.cookieName,
      });

      console.log("Current environment configuration:", config);
    } catch (error) {
      console.error("Error getting configuration:", error);
    }
  }, []);

  return (
    <div className="min-h-[300px] w-[350px] p-4">
      <h1 className="mb-4 text-xl font-bold">Filliny</h1>

      {/* Debug info */}
      <div className="mt-4 rounded-md bg-gray-100 p-2 text-sm dark:bg-slate-800">
        <h2 className="mb-2 font-semibold">Environment Configuration:</h2>
        {configInfo ? (
          <ul className="space-y-1">
            <li>
              <span className="font-medium">Environment:</span> {configInfo.env}
            </li>
            <li>
              <span className="font-medium">Base URL:</span> {configInfo.baseURL}
            </li>
            <li>
              <span className="font-medium">Cookie Name:</span> {configInfo.cookieName}
            </li>
          </ul>
        ) : (
          <p>Loading configuration...</p>
        )}
      </div>

      {/* Rest of your app */}
      <div className="mt-4">
        {auth ? (
          <>
            <RouterProvider />
          </>
        ) : (
          <SigninPage />
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(HomePage, <LoadingSpinner />), ErrorDisplay);
