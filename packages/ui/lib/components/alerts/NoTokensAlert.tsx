import { Alert } from './Alert';
import { getConfig, usePlanLimits } from '@extension/shared';
import { ExternalLink, AlertTriangle } from 'lucide-react';

/**
 * Credits warning thresholds
 */
const LOW_CREDITS_THRESHOLD = 2;

/**
 * Type for credit warning states
 */
type CreditWarningState = 'none' | 'warning' | 'error';

/**
 * Determine the warning state based on remaining forms/tokens
 */
const getCreditWarningState = (remaining: number, isPro: boolean): CreditWarningState => {
  if (remaining === 0) return 'error';
  if (!isPro && remaining <= LOW_CREDITS_THRESHOLD) return 'warning';
  return 'none';
};

interface NoTokensAlertProps {
  isPro?: boolean;
  freeFormsRemaining?: number;
}

/**
 * Alert shown when user has low or no credits
 *
 * States:
 * - Warning (yellow): Free user has low free forms remaining
 * - Error (red): Free user has 0 free forms OR Pro user has 0 tokens
 */
export default function NoTokensAlert({ isPro = false }: NoTokensAlertProps) {
  const config = getConfig();
  const { totalFreeForms } = usePlanLimits();

  if (isPro) {
    // Pro user who has exhausted their tokens
    return (
      <Alert
        variant="warning"
        icon={AlertTriangle}
        title="Token Limit Reached"
        description="Your tokens will refresh on your next billing cycle."
        buttonText="View Subscription"
        buttonIcon={ExternalLink}
        onButtonClick={() => window.open(`${config.baseURL}/pricing`, '_blank')}
      />
    );
  }

  // Free user who has used all free form fills
  return (
    <Alert
      variant="warning"
      icon={AlertTriangle}
      title="Free Forms Used"
      description={`Your ${totalFreeForms} free form fills are used. Subscribe to Pro for unlimited AI-powered form filling.`}
      buttonText="Subscribe to Pro"
      buttonIcon={ExternalLink}
      onButtonClick={() => window.open(`${config.baseURL}/pricing`, '_blank')}
    />
  );
}

export { getCreditWarningState, LOW_CREDITS_THRESHOLD };
export type { CreditWarningState };
