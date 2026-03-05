/**
 * Environment-aware PostHog configuration.
 * Analytics disabled in dev, enabled in preview and production.
 */
import { WebappEnvs } from '../types/enums.js';

const POSTHOG_API_KEY = 'phc_iHUXudBl6vRwc4KcPeOxEVxbymC4nYyfEEB5MbqxpnR';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

export interface PostHogConfig {
  apiKey: string;
  host: string;
  enabled: boolean;
}

export const getPostHogConfig = (env: WebappEnvs): PostHogConfig => ({
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
  enabled: env !== WebappEnvs.DEV,
});
