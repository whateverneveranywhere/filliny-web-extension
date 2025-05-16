import { getConfig, WebappEnvs } from "../utils/index.js";
import { posthog } from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { useAuthHealthCheckQuery } from "../hooks/queries/authQueries.js";

interface PostHogProviderProps {
  children: React.ReactNode;
  publicKey?: string;
  host?: string;
}

function PostHogProvider({
  children,
  publicKey = "phc_iHUXudBl6vRwc4KcPeOxEVxbymC4nYyfEEB5MbqxpnR",
  host = "https://eu.i.posthog.com",
}: PostHogProviderProps) {
  const config = getConfig();
  const posthogClient = usePostHog();
  const { data: healthCheck } = useAuthHealthCheckQuery();

  useEffect(() => {
    if (config.webappEnv === WebappEnvs.PROD) {
      posthog.init(publicKey, {
        api_host: host,
        capture_pageview: true,
        capture_performance: true,
        capture_exceptions: true,
        // Disable features that load remote scripts
        loaded: ph => {
          // Prevent loading session recording script
          ph.opt_out_capturing();
        },
        disable_session_recording: true,
        autocapture: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
      });
    }
  }, [publicKey, host]);

  // Identify user when health check data is available
  useEffect(() => {
    if (posthogClient && healthCheck?.status === "success" && healthCheck.user) {
      // Gather plan/subscription info if available
      const plan = healthCheck.limitations?.plan;
      const planInfo = plan
        ? {
            planId: plan.id,
            planName: plan.planName,
            planIsOnSale: plan.isOnSale,
            planCurrentPrice: plan.currentPrice,
            planMaxFillingProfiles: plan.maxFillingProfiles,
            planMaxWebsitesPerProfile: plan.maxWebsitesPerProfile,
          }
        : { planName: "Free", planId: null };

      posthogClient.identify(healthCheck.user.id, {
        email: healthCheck.user.email,
        name: healthCheck.user.name,
        image: healthCheck.user.image,
        phone: healthCheck.user.phone,
        formFillingsCredit: healthCheck.user.formFillingsCredit,
        // Add limitation properties
        maxFillingProfiles: healthCheck.limitations.maxFillingProfiles,
        maxWebsitesPerProfile: healthCheck.limitations.maxWebsitesPerProfile,
        ...planInfo,
      });
    }
  }, [posthogClient, healthCheck]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { PostHogProvider };
