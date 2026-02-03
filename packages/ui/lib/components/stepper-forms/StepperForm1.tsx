import { RecommendedWebsites } from './RecommendedWebsites';
import { WebsiteFormFields } from './WebsiteFormFields';
import { WebsitePreviewCard } from './WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { getConfig, usePlanLimits } from '@extension/shared';
import { ExternalLink, Plus } from 'lucide-react';
import { useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { ProfileFormTypes } from '@/lib/containers/profile-form';

const StepperForm1 = () => {
  const { control, watch } = useFormContext<ProfileFormTypes>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fillingWebsites',
  });
  const { currentPlan, maxWebsites, hasReachedWebsiteLimit } = usePlanLimits();
  const websitesReachedLimit = hasReachedWebsiteLimit(fields.length);
  const config = getConfig();

  const handleAdd = useCallback(() => {
    if (websitesReachedLimit) return;

    append({
      fillingContext: '',
      isRootLoad: true,
      websiteUrl: '',
      isNew: true,
    });
  }, [append, websitesReachedLimit]);

  const handleWebsiteSelect = useCallback(
    (websiteUrl: string) => {
      if (websitesReachedLimit) return;

      append({
        fillingContext: '',
        isRootLoad: true,
        websiteUrl,
        isNew: false,
      });
    },
    [append, websitesReachedLimit],
  );

  const latestWebsiteValues = watch('fillingWebsites');

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-4">
      <ScrollArea className="filliny-w-full">
        <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-pb-2">
          <RecommendedWebsites onWebsiteSelect={handleWebsiteSelect} hasReachedLimit={websitesReachedLimit} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="filliny-flex filliny-flex-col filliny-gap-3">
        {fields.map(
          (item, index) =>
            latestWebsiteValues && (
              <WebsitePreviewCard
                key={item.id}
                defaultExpanded={item.isNew}
                isRootLoad={!!latestWebsiteValues[index].isRootLoad}
                websiteURL={latestWebsiteValues[index].websiteUrl}
                onRemove={() => remove(index)}>
                <WebsiteFormFields index={index} />
              </WebsitePreviewCard>
            ),
        )}
      </div>

      <div className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="filliny-w-full">
                <Button
                  className="filliny-w-full"
                  onClick={handleAdd}
                  variant="outline"
                  disabled={websitesReachedLimit}>
                  <Plus className="filliny-mr-2 filliny-h-4 filliny-w-4" />
                  Add Website {fields.length > 0 && `(${fields.length}/${maxWebsites})`}
                </Button>
              </div>
            </TooltipTrigger>
            {websitesReachedLimit && (
              <TooltipContent className="filliny-max-w-xs filliny-p-3">
                <p className="filliny-text-sm">
                  You've reached the maximum number of websites for your {currentPlan} plan. Upgrade to add more
                  websites and unlock additional features.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {websitesReachedLimit && (
          <p className="filliny-text-xs filliny-text-muted-foreground">
            {currentPlan} plan limit reached.{' '}
            <a
              href={`${config.baseURL}/pricing`}
              target="_blank"
              rel="noopener noreferrer"
              className="filliny-inline-flex filliny-items-center filliny-gap-1 filliny-text-warning filliny-underline filliny-underline-offset-2 hover:filliny-text-warning/80">
              Upgrade
              <ExternalLink className="filliny-h-3 filliny-w-3" />
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default StepperForm1;

// Re-export WebsiteFormFields for backward compatibility
export { WebsiteFormFields } from './WebsiteFormFields';
