/* eslint-disable react/no-unescaped-entities */
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, UpgradeBanner } from '../components';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useActiveTabUrl } from '@extension/shared';

interface Props {
  onQuickAdd: () => void;
  isLoading: boolean;
  currentPlan: string;
  maxWebsites: number;
  websitesCount: number;
}

function QuickAddWebsiteToProfile({ onQuickAdd, isLoading, currentPlan, maxWebsites, websitesCount }: Props) {
  const isDisabled = websitesCount >= maxWebsites;
  const tooltipText = isDisabled
    ? `You've reached the maximum number of websites (${maxWebsites}) allowed for your ${currentPlan} plan`
    : 'Add this website to your profile';
  const { url, isLoading: isLoadingUrl, isValid } = useActiveTabUrl();

  const button = (
    <Button
      size="icon"
      variant={isDisabled ? 'ghost' : 'default'}
      onClick={onQuickAdd}
      disabled={isDisabled || isLoading || !isValid}
      className="filliny-transition-all hover:filliny-scale-105">
      <Plus />
    </Button>
  );

  return (
    <div className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4">
      {isDisabled && <UpgradeBanner />}

      <Card className="filliny-w-full">
        <CardHeader>
          <CardTitle>Want Filliny here?</CardTitle>{' '}
          <CardDescription>
            Quickly add this website to your active profile to enable Filliny's form-filling capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="filliny-space-y-4">
            <WebsitePreviewCard
              websiteURL={url}
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
              <p className="filliny-text-center filliny-text-sm filliny-text-muted-foreground">
                Loading website information...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { QuickAddWebsiteToProfile };
