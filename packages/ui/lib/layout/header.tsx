import { getConfig, useDashboardOverview } from '@extension/shared';
import { ProfileSelector } from './profile-selector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Badge, Button } from '../components';
import { Logo } from '../components/Logo';
import { Link } from 'react-router-dom';

function formatToK(number: number): string {
  if (number >= 1000) {
    const thousands = number / 1000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return number.toString();
}

function TokenDisplay({ tokens = 0 }) {
  const formattedTokens = tokens.toLocaleString();
  const abbreviatedTokens = formatToK(tokens);
  const config = getConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="filliny-flex filliny-items-center filliny-gap-2 filliny-p-2 filliny-rounded-md hover:filliny-bg-muted/50 filliny-transition-colors">
          <div className="filliny-flex filliny-flex-col">
            <span className="filliny-text-lg filliny-font-bold">{abbreviatedTokens}</span>
            <span className="filliny-text-xs filliny-text-muted-foreground">Tokens </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="filliny-flex filliny-w-64 filliny-flex-col filliny-gap-3 filliny-p-4">
          <div className="filliny-space-y-1">
            <p className="filliny-text-sm filliny-text-muted-foreground">Available Tokens</p>
            <Badge className="filliny-flex filliny-w-full filliny-items-center filliny-py-2" variant="default">
              <p className="filliny-w-full filliny-text-center filliny-text-lg">{formattedTokens}</p>
            </Badge>
          </div>
          <a
            className="filliny-w-full"
            href={`${config.baseURL}/pricing?tab=tokens`}
            target="_blank"
            rel="noopener noreferrer">
            <Button size={'sm'} variant={'default'} className="filliny-w-full">
              Purchase More Tokens →
            </Button>
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Header() {
  const { data: dashboardOverview } = useDashboardOverview();

  return (
    <header className="filliny-sticky filliny-top-0 filliny-z-50 filliny-w-full filliny-bg-background/95 filliny-backdrop-blur supports-[backdrop-filter]:filliny-bg-background/60">
      <div className="filliny-border-b">
        <div className="filliny-flex filliny-h-14 filliny-items-center filliny-justify-between filliny-px-4">
          {/* Left section - 1/5 width */}
          <div className="filliny-w-1/5 filliny-flex filliny-items-center filliny-gap-4">
            <TokenDisplay tokens={dashboardOverview?.remainingTokens || 0} />
          </div>

          {/* Center section - 3/5 width */}
          <div className="filliny-w-3/5 filliny-flex filliny-items-center filliny-justify-center">
            <ProfileSelector />
          </div>

          {/* Right section - 1/5 width */}
          <div className="filliny-w-1/5 filliny-flex filliny-items-center filliny-justify-end filliny-gap-3">
            <Link
              to={'https://filliny.io'}
              target="_blank"
              className="filliny-flex filliny-items-center hover:filliny-opacity-80">
              <Logo width={32} height={32} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export { Header };
