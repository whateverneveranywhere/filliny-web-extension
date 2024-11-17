import { formatToK, getConfig } from '@extension/shared';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface TokenDisplayProps {
  tokens?: number;
}

const config = getConfig();

function TokenDisplay({ tokens = 0 }: TokenDisplayProps) {
  const formattedTokens = tokens.toLocaleString();
  const abbreviatedTokens = formatToK(tokens);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="filliny-flex filliny-items-center filliny-gap-2 filliny-p-2 filliny-rounded-md hover:filliny-bg-muted/50 filliny-transition-colors">
          <div className="filliny-flex filliny-flex-col">
            <span className="filliny-font-bold">{abbreviatedTokens}</span>
            <span className="filliny-text-xs filliny-text-muted-foreground">Tokens</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="filliny-flex filliny-w-64 filliny-flex-col filliny-gap-3 filliny-p-4">
          <div className="filliny-space-y-1">
            <p className="filliny-text-sm filliny-text-muted-foreground">Available Tokens</p>
            <p className="filliny-w-full filliny-text-center filliny-text-lg">{formattedTokens}</p>
          </div>
          <a
            className="filliny-w-full"
            href={`${config.baseURL}/pricing?tab=tokens`}
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
