import { Button, UpgradeBanner } from '../components';
import { WebsitePreviewCard } from '../components/stepper-forms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useActiveTabUrl } from '@extension/shared';
import { Plus } from 'lucide-react';

interface Props {
  onQuickAdd: () => void;
  isLoading: boolean;
  currentPlan: string;
  maxWebsites: number;
  websitesCount: number;
}

const QuickAddWebsiteToProfile = ({ onQuickAdd, isLoading, currentPlan, maxWebsites, websitesCount }: Props) => {
  const isDisabled = websitesCount >= maxWebsites;
  const tooltipText = isDisabled
    ? `You've reached the maximum number of websites (${maxWebsites}) allowed for your ${currentPlan} plan`
    : 'Add this website to your profile';
  const { activeTabUrl, isLoading: isLoadingUrl, isValid } = useActiveTabUrl();

  const button = (
    <Button
      size="icon"
      variant={isDisabled ? 'ghost' : 'default'}
      onClick={onQuickAdd}
      disabled={isDisabled || isLoading || !isValid}
      className="filliny-h-8 filliny-w-8 filliny-transition-all hover:filliny-scale-105">
      <Plus className="filliny-h-4 filliny-w-4" />
    </Button>
  );

  return (
    <div className="filliny-flex filliny-w-full filliny-flex-1 filliny-flex-col">
      {/* Top section: Quick add */}
      <div className="filliny-flex filliny-flex-col filliny-gap-3">
        <div className="filliny-flex filliny-flex-col filliny-gap-1.5">
          <h3 className="filliny-text-base filliny-font-semibold filliny-leading-none filliny-text-foreground">
            Want Filliny here?
          </h3>
          <p className="filliny-text-sm filliny-text-muted-foreground">
            Add this website to your active profile to enable form-filling.
          </p>
        </div>

        <WebsitePreviewCard
          websiteURL={activeTabUrl}
          isRootLoad
          hideExpandTrigger
          isLoading={isLoading || isLoadingUrl}
          actions={
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger>{button}</TooltipTrigger>
                <TooltipContent className="filliny-max-w-xs">{tooltipText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />
        {isLoadingUrl && (
          <p className="filliny-text-sm filliny-text-muted-foreground">Loading website information...</p>
        )}
      </div>

      {/* Bottom section: Upgrade banner pushed to bottom */}
      {isDisabled && (
        <div className="filliny-mt-auto filliny-pt-4">
          <UpgradeBanner />
        </div>
      )}
    </div>
  );
};

export { QuickAddWebsiteToProfile };
