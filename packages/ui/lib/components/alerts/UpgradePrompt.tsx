import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getConfig, usePlanLimits } from '@extension/shared';
import { ArrowRight, Crown, Sparkles, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type PromptVariant = 'inline' | 'card' | 'minimal';

interface UpgradePromptProps {
  /** Reason for showing the upgrade prompt */
  reason?: 'website-limit' | 'profile-limit' | 'token-limit' | 'feature' | 'general';
  /** Visual variant */
  variant?: PromptVariant;
  /** Custom message to display */
  customMessage?: string;
  /** Whether to show the prompt */
  show?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UpgradePrompt - Subtle prompts to upgrade for free users
 *
 * Marketing best practices applied:
 * - Benefit-focused messaging (not feature-focused)
 * - Urgency through scarcity messaging
 * - Non-intrusive placement options
 * - Clear value proposition
 */
const UpgradePrompt = ({
  reason = 'general',
  variant = 'inline',
  customMessage,
  show = true,
  className,
}: UpgradePromptProps) => {
  const config = getConfig();
  const { isPro, currentPlan, maxWebsites, maxProfiles } = usePlanLimits();

  // Don't show for Pro users
  if (!show || isPro) return null;

  const getReasonContent = (): { icon: LucideIcon; title: string; description: string } => {
    switch (reason) {
      case 'website-limit':
        return {
          icon: Zap,
          title: `${maxWebsites} website limit reached`,
          description: 'Upgrade to Pro for more websites and unlimited AI fills',
        };
      case 'profile-limit':
        return {
          icon: Crown,
          title: `${maxProfiles} profile limit reached`,
          description: 'Upgrade to Pro for more profiles and unlimited AI fills',
        };
      case 'token-limit':
        return {
          icon: Sparkles,
          title: 'Free forms used',
          description: 'Subscribe to Pro for unlimited AI-powered form filling',
        };
      case 'feature':
        return {
          icon: Crown,
          title: 'Pro feature',
          description: customMessage || 'Unlock this feature with Pro',
        };
      default:
        return {
          icon: Sparkles,
          title: 'Unlock Pro',
          description: customMessage || 'Get unlimited AI form filling with Pro',
        };
    }
  };

  const content = getReasonContent();
  const Icon = content.icon;
  const upgradeUrl = `${config.baseURL}/pricing`;

  if (variant === 'minimal') {
    return (
      <a
        href={upgradeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`filliny-flex filliny-items-center filliny-gap-1.5 filliny-text-xs filliny-text-warning filliny-transition-colors hover:filliny-text-warning/80 ${className}`}>
        <Crown className="filliny-h-3 filliny-w-3" />
        <span>Upgrade to Pro</span>
        <ArrowRight className="filliny-h-3 filliny-w-3" />
      </a>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className={`filliny-flex filliny-items-center filliny-justify-between filliny-gap-2 filliny-rounded-lg filliny-border filliny-border-warning/20 filliny-bg-warning/5 filliny-backdrop-blur-sm filliny-px-3 filliny-py-2 ${className}`}>
        <div className="filliny-flex filliny-items-center filliny-gap-2">
          <Icon className="filliny-h-4 filliny-w-4 filliny-text-warning" />
          <span className="filliny-text-xs filliny-text-muted-foreground">{content.description}</span>
        </div>
        <Button
          variant="warning"
          size="sm"
          className="filliny-h-7 filliny-gap-1 filliny-px-2 filliny-text-xs"
          onClick={() => window.open(upgradeUrl, '_blank')}>
          <Crown className="filliny-h-3 filliny-w-3" />
          Pro
        </Button>
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={`filliny-rounded-xl filliny-border filliny-border-warning/30 filliny-bg-gradient-to-br filliny-from-warning/10 filliny-to-transparent filliny-backdrop-blur-sm filliny-p-4 ${className}`}>
      <div className="filliny-flex filliny-items-start filliny-gap-3">
        <div className="filliny-flex filliny-h-10 filliny-w-10 filliny-shrink-0 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-warning/20">
          <Icon className="filliny-h-5 filliny-w-5 filliny-text-warning" />
        </div>
        <div className="filliny-flex filliny-flex-1 filliny-flex-col filliny-gap-1">
          <div className="filliny-flex filliny-items-center filliny-gap-2">
            <span className="filliny-text-sm filliny-font-semibold filliny-text-foreground">{content.title}</span>
            <Badge variant="warning" className="filliny-text-xs">
              {currentPlan}
            </Badge>
          </div>
          <p className="filliny-text-xs filliny-text-muted-foreground">{content.description}</p>
          <Button
            variant="warning"
            size="sm"
            className="filliny-mt-2 filliny-w-full filliny-gap-1.5"
            onClick={() => window.open(upgradeUrl, '_blank')}>
            Upgrade to Pro
            <ArrowRight className="filliny-h-3.5 filliny-w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { UpgradePrompt };
export type { UpgradePromptProps, PromptVariant };
