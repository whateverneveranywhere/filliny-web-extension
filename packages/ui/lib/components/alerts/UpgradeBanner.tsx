import { Alert } from './Alert';
import { getConfig, useActiveProfile, usePlanLimits } from '@extension/shared';
import { ExternalLink, Sparkles } from 'lucide-react';

/**
 * UpgradeBanner component for prompting users to subscribe to Pro
 *
 * Shows when:
 * - Free user has reached website limit (3 websites)
 * - User is at profile limit
 *
 * Pricing Model:
 * - Free tier: 5 free form fills, 1 profile, 3 websites
 * - Pro tier: $29/month, 50M tokens, 100 profiles, 500 websites
 */
export default function UpgradeBanner() {
  const { currentPlan, maxWebsites, isPro, hasReachedWebsiteLimit, PRO_TIER_LIMITS } = usePlanLimits();
  const { activeProfile } = useActiveProfile();
  const config = getConfig();

  const websitesCount = activeProfile?.fillingWebsites?.length || 0;

  // Don't show upgrade banner for Pro users
  if (isPro || !hasReachedWebsiteLimit(websitesCount)) {
    return null;
  }

  const title = `${currentPlan} Plan Limit • ${maxWebsites} websites`;
  const description = `Subscribe to Pro for ${PRO_TIER_LIMITS.MAX_WEBSITES} websites, ${PRO_TIER_LIMITS.MAX_PROFILES} profiles, and unlimited AI-powered form filling`;
  const handleUpgrade = () => window.open(`${config.baseURL}/pricing`, '_blank');

  return (
    <div className="filliny-w-full">
      <Alert
        variant="warning"
        icon={Sparkles}
        title={title}
        description={description}
        buttonText="Subscribe to Pro"
        buttonIcon={ExternalLink}
        onButtonClick={handleUpgrade}
      />
    </div>
  );
}
