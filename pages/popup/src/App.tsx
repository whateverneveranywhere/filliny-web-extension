import {
  BackgroundActions,
  useStorage,
  withErrorBoundary,
  withSuspense,
  getConfig,
  WebappEnvs,
} from "@extension/shared";
import { authStorage } from "@extension/storage";
import { RouterProvider, SigninPage } from "@extension/ui";
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
      // Determine which environment is being used
      let currentEnv = "unknown";
      Object.values(WebappEnvs).forEach(env => {
        if (config.baseURL === getConfig(env as WebappEnvs).baseURL) {
          currentEnv = env;
        }
      });

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
    <div className="w-[350px] min-h-[300px] p-4">
      <h1 className="text-xl font-bold mb-4">Filliny</h1>

      {/* Debug info */}
      <div className="mt-4 p-2 bg-gray-100 dark:bg-slate-800 rounded-md text-sm">
        <h2 className="font-semibold mb-2">Environment Configuration:</h2>
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

export default withErrorBoundary(withSuspense(HomePage, <div> Loading ... </div>), <div> Error Occur </div>);
