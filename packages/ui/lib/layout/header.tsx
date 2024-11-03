import { useDashboardOverview } from '@extension/shared';
import { Logo } from '../components/Logo';
import { ProfileSelector } from './profile-selector';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Coins } from 'lucide-react';

function formatToK(number: number): string {
  if (number >= 1000) {
    const thousands = number / 1000;
    // If it's a whole number, don't show decimal places
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return number.toString();
}

function TokenDisplay({ tokens = 0 }) {
  const formattedTokens = tokens.toLocaleString();
  const abbreviatedTokens = formatToK(tokens);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-1">
          <Coins className="filliny-h-4 filliny-w-4" />
          <span className="filliny-text-xs">{abbreviatedTokens}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formattedTokens} tokens remaining</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Header() {
  const { data: dashboardOverview } = useDashboardOverview();

  return (
    <header className="filliny-grid filliny-grid-cols-12 filliny-items-center filliny-gap-4">
      <div className="filliny-col-span-2">
        <TokenDisplay tokens={dashboardOverview?.remainingTokens || 0} />
      </div>
      <div className="filliny-col-span-8 filliny-mx-auto filliny-flex filliny-items-center filliny-justify-center">
        <ProfileSelector />
      </div>
      <div className="filliny-col-span-2 filliny-flex filliny-justify-end">
        <Link to={'https://filliny.io'} target="_blank">
          <Logo />
        </Link>
      </div>
    </header>
  );
}

export { Header };
