import { ToastAction } from '@/lib/components/ui/toast';
import { toast } from '@/lib/hooks/use-toast';
import { getConfig } from '@extension/shared';

/**
 * Show a toast for quota exceeded errors.
 * Displays a destructive toast with an action to open the pricing page.
 */
export const showQuotaExceededToast = (message?: string): void => {
  const config = getConfig();
  const pricingUrl = `${config.baseURL}/pricing`;

  // Detect whether this is a token limit message (Pro users) or free forms message
  const isTokenLimit = message?.toLowerCase().includes('token');

  toast({
    variant: 'destructive',
    title: isTokenLimit ? 'Token Limit Reached' : 'Free Forms Used',
    description:
      message ||
      (isTokenLimit
        ? 'You have reached your token limit. Tokens refresh on your billing cycle.'
        : 'You have used all your free forms. Subscribe to Pro for unlimited form filling.'),
    action: isTokenLimit ? undefined : (
      <ToastAction altText="Subscribe to Pro" onClick={() => window.open(pricingUrl, '_blank')}>
        Upgrade
      </ToastAction>
    ),
  });
};

/**
 * Show a toast for authentication errors.
 * Displays a destructive toast with an action to open the sign-in page.
 */
export const showAuthErrorToast = (message?: string): void => {
  const config = getConfig();
  const loginUrl = `${config.baseURL}/sign-in`;

  toast({
    variant: 'destructive',
    title: 'Session Expired',
    description: message || 'Your session has expired. Please sign in again.',
    action: (
      <ToastAction altText="Sign In" onClick={() => window.open(loginUrl, '_blank')}>
        Sign In
      </ToastAction>
    ),
  });
};

/**
 * Show a toast for generic fill errors.
 */
export const showFillErrorToast = (message: string): void => {
  toast({
    variant: 'destructive',
    title: 'Fill Failed',
    description: message,
  });
};

/**
 * Show an informational toast (e.g., no forms found).
 */
export const showInfoToast = (title: string, description: string): void => {
  toast({
    title,
    description,
  });
};
