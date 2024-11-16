import { getConfig, useDashboardOverview } from '@extension/shared';
import { ProfileSelector } from './profile-selector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Badge, Button, ModeToggle } from '../components';

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
        <TooltipTrigger className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-0.5">
          <span className="filliny-text-sm filliny-font-bold">{abbreviatedTokens}</span>
          <span className="filliny-text-xs filliny-font-semibold">Tokens</span>
        </TooltipTrigger>
        <TooltipContent className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-gap-1">
          <Badge className="filliny-flex filliny-w-full filliny-items-center filliny-py-2" variant="default">
            <p className="filliny-w-full filliny-text-center">{formattedTokens}</p>
          </Badge>
          <a
            className="filliny-w-full"
            href={`${config.baseURL}/pricing?tab=tokens`}
            target="_blank"
            rel="noopener noreferrer">
            <Button size={'sm'} variant={'link'}>
              Buy more tokens
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
    <header className="filliny-grid filliny-grid-cols-12 filliny-items-center filliny-gap-4">
      <div className="filliny-col-span-2">
        <TokenDisplay tokens={dashboardOverview?.remainingTokens || 0} />
      </div>
      <div className="filliny-col-span-8 filliny-mx-auto filliny-flex filliny-items-center filliny-justify-center">
        <ProfileSelector />
      </div>

      <div className="filliny-col-span-2 filliny-flex filliny-justify-end">
        {/* <Link to={'https://filliny.io'} target="_blank">
          <Logo />
        </Link> */}
        <ModeToggle />
      </div>
    </header>
  );
}

export { Header };
