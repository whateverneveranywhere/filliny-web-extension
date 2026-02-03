import { Popover, PopoverContent, PopoverTrigger, Loading } from '../ui';
import { Button } from '../ui/button';
import { formatToK, getConfig, usePlanLimits } from '@extension/shared';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCreditWarningState } from '../alerts/NoTokensAlert';
import type { CreditWarningState } from '../alerts/NoTokensAlert';
import { cn } from '@/lib/utils';

interface TokenDisplayProps {
  tokens?: number;
  freeFormsRemaining?: number;
  isPro?: boolean;
  onRefresh?: () => Promise<void>;
  isRefetching?: boolean;
  isLoading?: boolean;
}

const COOLDOWN_DURATION = 10000; // 10 seconds in milliseconds

/**
 * TokenDisplay component for showing usage status
 *
 * For Free users: Shows "X free forms" remaining with warning states
 * For Pro users: Shows token count with abbreviated format
 *
 * Warning states:
 * - Warning (yellow indicator): 1-2 free forms remaining
 * - Error (red indicator): 0 free forms or 0 tokens
 */
const TokenDisplay = ({
  tokens = 0,
  freeFormsRemaining = 0,
  isPro = false,
  onRefresh,
  isRefetching = false,
  isLoading = false,
}: TokenDisplayProps) => {
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const formattedTokens = tokens.toLocaleString();
  const abbreviatedTokens = formatToK(tokens);
  const config = getConfig();
  const { FREE_TIER_LIMITS } = usePlanLimits();

  // Determine warning state
  const warningState: CreditWarningState = getCreditWarningState(isPro ? tokens : freeFormsRemaining, isPro);
  const hasWarning = warningState === 'warning';
  const hasError = warningState === 'error';

  const handleRefresh = async () => {
    if (isRefetching || isOnCooldown || !onRefresh) return;

    await onRefresh();
    setIsOnCooldown(true);
    setCooldownRemaining(COOLDOWN_DURATION);
  };

  // Handle cooldown timer
  useEffect(() => {
    if (!isOnCooldown) return;

    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1000) {
          setIsOnCooldown(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnCooldown]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  // Calculate used forms for free tier (total - remaining)
  const freeFormsUsed = FREE_TIER_LIMITS.MAX_FREE_FORMS - freeFormsRemaining;

  // Determine display based on user tier
  const displayValue = isPro ? abbreviatedTokens : String(freeFormsRemaining);
  const displayLabel = isPro ? 'Tokens' : 'Free Forms';
  const tooltipTitle = isPro ? 'Available Tokens' : 'Free Form Fills';
  const actionButtonText = isPro ? 'Purchase More Tokens' : 'Subscribe to Pro';
  const actionUrl = isPro ? `${config.baseURL}/pricing?tab=token` : `${config.baseURL}/pricing`;

  // Get warning message for tooltip
  const getWarningMessage = () => {
    if (hasError) {
      return isPro
        ? 'Token limit reached. Purchase more tokens to continue.'
        : 'Free forms exhausted. Subscribe to Pro to continue.';
    }
    if (hasWarning) {
      return `Running low on free forms. Only ${freeFormsRemaining} remaining.`;
    }
    return null;
  };

  const warningMessage = getWarningMessage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="filliny-flex filliny-items-center filliny-gap-2 filliny-rounded-md filliny-p-2 filliny-transition-colors hover:filliny-bg-muted/50">
          <div className="filliny-flex filliny-flex-col filliny-items-center">
            {isLoading ? (
              <Loading size="sm" />
            ) : isPro ? (
              <span
                className={cn(
                  'filliny-font-bold',
                  (hasError || hasWarning) && 'filliny-text-warning',
                )}>
                {displayValue}
              </span>
            ) : (
              <div className="filliny-flex filliny-items-baseline filliny-gap-0.5">
                <span
                  className={cn(
                    'filliny-text-lg filliny-font-bold filliny-tabular-nums filliny-leading-none',
                    (hasError || hasWarning) && 'filliny-text-warning',
                  )}>
                  {freeFormsUsed}
                </span>
                <span className="filliny-text-xs filliny-text-muted-foreground">/</span>
                <span className="filliny-text-xs filliny-text-muted-foreground filliny-tabular-nums">
                  {FREE_TIER_LIMITS.MAX_FREE_FORMS}
                </span>
              </div>
            )}
            <span className="filliny-text-xs filliny-text-muted-foreground">{displayLabel}</span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="filliny-flex filliny-w-64 filliny-flex-col filliny-gap-3 filliny-p-4">
          <div className="filliny-flex filliny-items-center filliny-justify-between">
            <p className="filliny-text-sm filliny-text-muted-foreground">{tooltipTitle}</p>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefetching || isOnCooldown || !onRefresh}
              className="filliny-h-8 filliny-w-8 filliny-transition-all hover:filliny-bg-muted">
              {cooldownSeconds ? <span>{cooldownSeconds}s</span> : <RefreshCw className="filliny-h-4 filliny-w-4" />}
            </Button>
          </div>
          <div className="filliny-flex filliny-items-baseline filliny-justify-center filliny-gap-1">
            {isPro ? (
              <p
                className={cn(
                  'filliny-text-lg filliny-font-medium',
                  (hasError || hasWarning) && 'filliny-text-warning',
                )}>
                {formattedTokens}
              </p>
            ) : (
              <>
                <span
                  className={cn(
                    'filliny-text-2xl filliny-font-bold filliny-tabular-nums',
                    (hasError || hasWarning) && 'filliny-text-warning',
                  )}>
                  {freeFormsUsed}
                </span>
                <span className="filliny-text-muted-foreground">/</span>
                <span className="filliny-text-sm filliny-text-muted-foreground filliny-tabular-nums">
                  {FREE_TIER_LIMITS.MAX_FREE_FORMS}
                </span>
                <span className="filliny-ml-1 filliny-text-xs filliny-text-muted-foreground">used</span>
              </>
            )}
          </div>
          {/* Warning message - always subtle warning styling */}
          {warningMessage && (
            <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-rounded-md filliny-bg-warning/10 filliny-p-2">
              <AlertTriangle className="filliny-h-4 filliny-w-4 filliny-shrink-0 filliny-text-warning" />
              <p className="filliny-text-xs filliny-text-warning">{warningMessage}</p>
            </div>
          )}
          <a className="filliny-w-full" href={actionUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size={'sm'}
              variant={(hasError || hasWarning) ? 'warning' : 'default'}
              className="filliny-w-full">
              {actionButtonText}
            </Button>
          </a>
        </PopoverContent>
    </Popover>
  );
};

export { TokenDisplay };
export type { TokenDisplayProps };
