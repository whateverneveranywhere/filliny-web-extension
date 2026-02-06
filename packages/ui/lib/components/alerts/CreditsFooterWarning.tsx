import { getCreditWarningState, LOW_CREDITS_THRESHOLD } from './NoTokensAlert';
import { cn } from '@/lib/utils';
import { getConfig, usePlanLimits } from '@extension/shared';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import type { CreditWarningState } from './NoTokensAlert';

interface CreditsFooterWarningProps {
  freeFormsRemaining?: number;
  tokensRemaining?: number;
  isPro?: boolean;
  className?: string;
}

/**
 * Compact footer warning for low/no credits
 *
 * Displays in the footer area (not as a blocking banner):
 * - Warning state (yellow/amber): Low or no credits remaining
 * - Uses subtle warning styling (not aggressive red) for better UX
 */
const CreditsFooterWarning = ({
  freeFormsRemaining = 0,
  tokensRemaining = 0,
  isPro = false,
  className,
}: CreditsFooterWarningProps) => {
  const config = getConfig();
  const { FREE_TIER_LIMITS } = usePlanLimits();
  const warningState: CreditWarningState = getCreditWarningState(isPro ? tokensRemaining : freeFormsRemaining, isPro);

  // Don't render if no warning needed
  if (warningState === 'none') return null;

  const actionUrl = `${config.baseURL}/pricing`;

  // Warning messages based on state and user type
  const getMessage = () => {
    if (isPro) {
      return {
        title: 'Token Limit Reached',
        description: 'Tokens refresh on your next billing cycle.',
        buttonText: 'View Subscription',
      };
    }

    if (warningState === 'error') {
      return {
        title: 'Free Forms Exhausted',
        description: 'Subscribe to Pro to continue filling forms.',
        buttonText: 'Subscribe to Pro',
      };
    }

    return {
      title: 'Running Low on Free Forms',
      description: `Only ${freeFormsRemaining} of ${FREE_TIER_LIMITS.MAX_FREE_FORMS} free forms remaining.`,
      buttonText: 'Subscribe to Pro',
    };
  };

  const { title, description, buttonText } = getMessage();

  return (
    <div
      className={cn(
        'filliny-flex filliny-flex-col filliny-gap-2.5 filliny-rounded-lg filliny-border filliny-px-3 filliny-py-2.5',
        'filliny-border-warning/30 filliny-bg-warning/5 filliny-backdrop-blur-sm',
        className,
      )}>
      <div className="filliny-flex filliny-items-start filliny-gap-2.5">
        <AlertTriangle className="filliny-mt-0.5 filliny-h-4 filliny-w-4 filliny-shrink-0 filliny-text-warning" />
        <div className="filliny-flex filliny-min-w-0 filliny-flex-1 filliny-flex-col">
          <span className="filliny-text-xs filliny-font-medium filliny-text-warning">{title}</span>
          <span className="filliny-text-xs filliny-text-muted-foreground">{description}</span>
        </div>
      </div>
      <a
        href={actionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="filliny-flex filliny-w-full filliny-items-center filliny-justify-center filliny-gap-1 filliny-rounded-md filliny-border filliny-border-warning/30 filliny-bg-warning filliny-px-2.5 filliny-py-1.5 filliny-text-xs filliny-font-medium filliny-text-warning-foreground filliny-transition-colors hover:filliny-bg-warning/90">
        {buttonText}
        <ExternalLink className="filliny-h-3 filliny-w-3" />
      </a>
    </div>
  );
};

export { CreditsFooterWarning, LOW_CREDITS_THRESHOLD };
export type { CreditsFooterWarningProps };
