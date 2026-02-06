import { Button, UpgradeBanner } from '../components';
import { WebsitePreviewCard } from '../components/stepper-forms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useActiveTabUrl } from '@extension/shared';
import { Plus, Zap } from 'lucide-react';

interface Props {
  onQuickAdd: () => void;
  isLoading: boolean;
  currentPlan: string;
  maxWebsites: number;
  websitesCount: number;
}

const QuickAddWebsiteToProfile = ({ onQuickAdd, isLoading, currentPlan, maxWebsites, websitesCount }: Props) => {
  const isDisabled = websitesCount >= maxWebsites;
  const isFirstWebsite = websitesCount === 0;
  const tooltipText = isDisabled
    ? `You've reached the maximum of ${maxWebsites} websites for your ${currentPlan} plan`
    : isFirstWebsite
      ? 'One click to enable AI form filling on this site'
      : 'Add this website to your profile';
  const { activeTabUrl, isLoading: isLoadingUrl, isValid } = useActiveTabUrl();

  const button = (
    <Button
      size={isFirstWebsite ? 'sm' : 'icon'}
      variant={isDisabled ? 'ghost' : 'default'}
      onClick={onQuickAdd}
      disabled={isDisabled || isLoading || !isValid}
      loading={isLoading}
      className={
        isFirstWebsite
          ? 'filliny-gap-1.5 filliny-transition-all hover:filliny-scale-[1.02]'
          : 'filliny-h-8 filliny-w-8 filliny-transition-all hover:filliny-scale-105'
      }>
      {isFirstWebsite ? (
        <>
          <Zap className="filliny-h-3.5 filliny-w-3.5" />
          Enable Filliny
        </>
      ) : (
        <Plus className="filliny-h-4 filliny-w-4" />
      )}
    </Button>
  );

  return (
    <div className="filliny-flex filliny-w-full filliny-flex-1 filliny-flex-col">
      {/* Top section: Quick add */}
      <div className="filliny-flex filliny-flex-col filliny-gap-3">
        <div className="filliny-flex filliny-flex-col filliny-gap-1">
          <h3 className="filliny-text-sm filliny-font-semibold filliny-leading-none filliny-tracking-tight filliny-text-foreground">
            {isFirstWebsite ? 'Ready to Fill Forms Faster?' : 'Enable Filliny Here'}
          </h3>
          <p className="filliny-text-xs filliny-text-muted-foreground">
            {isFirstWebsite
              ? 'Add this website to start filling forms with AI in seconds.'
              : `Add this website to your profile (${websitesCount}/${maxWebsites} used)`}
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
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent className="filliny-max-w-xs">{tooltipText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />

        {isLoadingUrl && <p className="filliny-text-xs filliny-text-muted-foreground">Detecting website...</p>}
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
