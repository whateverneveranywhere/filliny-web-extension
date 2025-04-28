import { getConfig, WebappEnvs } from "../utils/index.js";
import { posthog } from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

function PostHogProvider({ children }: { children: React.ReactNode }) {
  const config = getConfig();

  useEffect(() => {
    if (config.webappEnv === WebappEnvs.PROD) {
      posthog.init("phc_iHUXudBl6vRwc4KcPeOxEVxbymC4nYyfEEB5MbqxpnR", {
        api_host: "https://eu.i.posthog.com",
        capture_pageview: true,
        capture_performance: true,
        capture_exceptions: true,
        capture_dead_clicks: true,
        capture_pageleave: true,
        capture_heatmaps: true,
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { PostHogProvider };
