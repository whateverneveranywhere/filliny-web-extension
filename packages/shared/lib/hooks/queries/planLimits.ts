import { useAuthHealthCheckQuery } from './authQueries.js';
import { computeIsPro, toUserStatus, AuthHealthCheckSchema } from '../../services/schemas/index.js';
import { useAuthContextSafe } from '../AuthContext.js';
import { z } from 'zod';
import type { UserStatus } from '../../services/schemas/index.js';

/**
 * Free tier constants for display purposes.
 * These match the Free tier from the main app's PRICING_CONFIG.
 * Used to show "X/5 free forms" in UI - the total doesn't change.
 */
const FREE_TIER_LIMITS = {
  MAX_FREE_FORMS: 5,
  MAX_PROFILES: 1,
  MAX_WEBSITES: 3,
} as const;

/**
 * Options schema for usePlanLimits hook
 */
const _UsePlanLimitsOptionsSchema = z.object({
  /** Whether to enable the underlying query. Pass false when user is not authenticated. */
  enabled: z.boolean().optional(),
});

type UsePlanLimitsOptions = z.infer<typeof _UsePlanLimitsOptionsSchema>;

/**
 * Hook to access plan limitations and computed user status.
 *
 * All limits are fetched dynamically from the API - no hardcoded values.
 * The API returns the user's actual plan limits based on their subscription.
 *
 * This hook automatically integrates with AuthContext when available:
 * - If inside AuthProvider, it only makes API calls when user is authenticated
 * - If outside AuthProvider, it uses the enabled option as a fallback
 *
 * Returns:
 * - tokensRemaining: Number of tokens the user has remaining (Pro users)
 * - freeFormsRemaining: Number of free form fills remaining (Free users)
 * - maxProfiles: Maximum filling profiles allowed (from API)
 * - maxWebsites: Maximum websites per profile (from API)
 * - isPro: Boolean indicating if user has Pro subscription
 * - canFillForms: Whether the user can fill forms (has tokens or free forms)
 * - hasReachedLimit: Helper function to check if a limit has been reached
 * - isLoading: Loading state
 * - userStatus: Full UserStatus object
 *
 * @param options.enabled - Whether to enable the underlying query (default: true when authenticated)
 */
export const usePlanLimits = (options?: UsePlanLimitsOptions) => {
  // Get auth state from context if available (returns null if outside AuthProvider)
  const authContext = useAuthContextSafe();

  // Determine if query should be enabled:
  // 1. If inside AuthProvider, only enable when authenticated
  // 2. If outside AuthProvider (authContext is null), use the enabled option (defaults to true for backward compat)
  const { enabled: explicitEnabled } = options ?? {};
  const isAuthenticated = authContext?.isAuthenticated ?? true; // Default to true when outside provider for backward compat
  const queryEnabled = explicitEnabled !== undefined ? explicitEnabled : isAuthenticated;

  const { data: healthCheck, isLoading: isHealthCheckLoading } = useAuthHealthCheckQuery(queryEnabled);

  // Type-safe access to limitations using Zod validation
  const parseResult = AuthHealthCheckSchema.safeParse(healthCheck);
  const limitations = parseResult.success ? parseResult.data.limitations : undefined;

  // Compute derived values - API returns actual limits for user's plan
  const tokensRemaining = limitations?.tokensRemaining ?? 0;
  const freeFormsRemaining = limitations?.freeFormsRemaining ?? 0;
  const maxProfiles = limitations?.maxFillingProfiles ?? FREE_TIER_LIMITS.MAX_PROFILES;
  const maxWebsites = limitations?.maxWebsitesPerProfile ?? FREE_TIER_LIMITS.MAX_WEBSITES;
  const isPro = limitations ? computeIsPro(limitations) : false;

  // Build user status object when data is available
  const userStatus: UserStatus | null = limitations ? toUserStatus(limitations) : null;

  // Determine current plan name
  const currentPlan = isPro ? 'Pro' : 'Free';

  // Can fill forms if Pro with tokens OR Free with free forms remaining
  const canFillForms = isPro ? tokensRemaining > 0 : freeFormsRemaining > 0;

  const hasReachedLimit = (count: number, limit: number) => count >= limit;
  const hasReachedWebsiteLimit = (websitesCount: number) => hasReachedLimit(websitesCount, maxWebsites);
  const hasReachedProfileLimit = (profilesCount: number) => hasReachedLimit(profilesCount, maxProfiles);

  return {
    // Basic limits
    tokensRemaining,
    freeFormsRemaining,
    maxProfiles,
    maxWebsites,

    // Computed status
    isPro,
    currentPlan,
    canFillForms,
    userStatus,

    // Free tier constants (for display "X/5 free forms")
    FREE_TIER_LIMITS,

    // Helper functions
    hasReachedWebsiteLimit,
    hasReachedProfileLimit,
    hasReachedLimit,

    // Loading state
    isLoading: isHealthCheckLoading || healthCheck === undefined,
  };
};
