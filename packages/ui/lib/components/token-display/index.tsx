import { formatToK, getConfig } from '@extension/shared';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loading } from '../ui';

interface TokenDisplayProps {
  tokens?: number;
  onRefresh?: () => Promise<void>;
  isRefetching?: boolean;
  isLoading?: boolean;
}

const COOLDOWN_DURATION = 10000; // 10 seconds in milliseconds

function TokenDisplay({ tokens = 0, onRefresh, isRefetching = false, isLoading = false }: TokenDisplayProps) {
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const formattedTokens = tokens.toLocaleString();
  const abbreviatedTokens = formatToK(tokens);
  const config = getConfig();

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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="filliny-flex filliny-items-center filliny-gap-2 filliny-rounded-md filliny-p-2 filliny-transition-colors hover:filliny-bg-muted/50">
          <div className="filliny-flex filliny-flex-col">
            <span className="filliny-font-bold">{isLoading ? <Loading size="sm" /> : abbreviatedTokens}</span>
            <span className="filliny-text-xs filliny-text-muted-foreground">Tokens</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="filliny-flex filliny-w-64 filliny-flex-col filliny-gap-3 filliny-p-4">
          <div className="filliny-flex filliny-items-center filliny-justify-between">
            <p className="filliny-text-sm filliny-text-muted-foreground">Available Tokens</p>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefetching || isOnCooldown || !onRefresh}
              className={`filliny-h-8 filliny-w-8 filliny-transition-all hover:filliny-bg-muted ${
                isRefetching ? 'filliny-animate-spin filliny-text-muted-foreground' : 'hover:filliny-text-primary'
              }`}>
              {cooldownSeconds ? <span>{cooldownSeconds}s</span> : <RefreshCw className="filliny-h-4 filliny-w-4" />}
            </Button>
          </div>
          <div>
            <p className="filliny-text-center filliny-text-lg filliny-font-medium">{formattedTokens}</p>
          </div>
          <a
            className="filliny-w-full"
            href={`${config.baseURL}/pricing?tab=token`}
            target="_blank"
            rel="noopener noreferrer">
            <Button size={'sm'} variant={'default'} className="filliny-w-full">
              Purchase More Tokens
            </Button>
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { TokenDisplay };
export type { TokenDisplayProps };
