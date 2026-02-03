import { useAuthHealthCheckQuery } from './authQueries.js';
import { computeIsPro, toUserStatus } from '../../services/schemas/index.js';
import type { AuthHealthCheckResponse, UserStatus } from '../../services/schemas/index.js';

/**
 * Free tier limits
 */
const FREE_TIER_LIMITS = {
  MAX_FREE_FORMS: 5,
  MAX_PROFILES: 1,
  MAX_WEBSITES: 3,
} as const;

/**
 * Pro tier limits
 */
const PRO_TIER_LIMITS = {
  MONTHLY_PRICE: 29,
  TOKEN_LIMIT: 50_000_000, // 50M tokens
  MAX_PROFILES: 100,
  MAX_WEBSITES: 500,
} as const;

/**
 * Options for usePlanLimits hook
 */
interface UsePlanLimitsOptions {
  /** Whether to enable the underlying query. Pass false when user is not authenticated. */
  enabled?: boolean;
}

/**
 * Hook to access plan limitations and computed user status
 *
 * Pricing Model:
 * - Free tier: 5 free form fills, 1 profile, 3 websites per profile
 * - Pro tier: $29/month, 50M tokens, 100 profiles, 500 websites per profile
 *
 * Returns:
 * - tokensRemaining: Number of tokens the user has remaining (Pro users)
 * - freeFormsRemaining: Number of free form fills remaining (Free users)
 * - maxProfiles: Maximum filling profiles allowed
 * - maxWebsites: Maximum websites per profile
 * - isPro: Boolean indicating if user has Pro subscription
 * - canFillForms: Whether the user can fill forms (has tokens or free forms)
 * - hasReachedLimit: Helper function to check if a limit has been reached
 * - isLoading: Loading state
 * - userStatus: Full UserStatus object
 *
 * @param options.enabled - Whether to enable the underlying query (default: true)
 */
export const usePlanLimits = (options?: UsePlanLimitsOptions) => {
  const { enabled = true } = options ?? {};
  const { data: healthCheck, isLoading: isHealthCheckLoading } = useAuthHealthCheckQuery(enabled);

  // Type-safe access to limitations
  const limitations = (healthCheck as AuthHealthCheckResponse | undefined)?.limitations;

  // Compute derived values
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

    // Tier constants for display
    FREE_TIER_LIMITS,
    PRO_TIER_LIMITS,

    // Helper functions
    hasReachedWebsiteLimit,
    hasReachedProfileLimit,
    hasReachedLimit,

    // Loading state
    isLoading: isHealthCheckLoading || healthCheck === undefined,
  };
};
