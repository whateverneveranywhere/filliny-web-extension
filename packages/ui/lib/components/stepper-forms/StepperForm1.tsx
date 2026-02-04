import { RecommendedWebsites } from './RecommendedWebsites';
import { WebsiteFormFields } from './WebsiteFormFields';
import { WebsitePreviewCard } from './WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { usePlanLimits } from '@extension/shared';
import { Globe, Plus, Sparkles } from 'lucide-react';
import { useCallback } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { ProfileFormTypes } from '@/lib/containers/profile-form';

const StepperForm1 = () => {
  const { control } = useFormContext<ProfileFormTypes>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fillingWebsites',
  });
  const { currentPlan, maxWebsites, hasReachedWebsiteLimit } = usePlanLimits();
  const websitesReachedLimit = hasReachedWebsiteLimit(fields.length);

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

  // Use useWatch for better reactivity when individual fields change
  const latestWebsiteValues = useWatch({ control, name: 'fillingWebsites' });

  const hasNoWebsites = fields.length === 0;

  return (
    <div className="filliny-flex filliny-h-full filliny-w-full filliny-min-w-0 filliny-flex-col filliny-overflow-hidden">
      {/* Scrollable Content */}
      <div className="filliny-flex filliny-flex-1 filliny-flex-col filliny-gap-4 filliny-overflow-hidden">
        {/* Empty State - Show encouraging message for new users */}
        {hasNoWebsites && (
          <Card className="filliny-border-dashed filliny-border-primary/30 filliny-bg-primary/5">
            <CardHeader className="filliny-pb-2">
              <div className="filliny-flex filliny-items-center filliny-gap-2">
                <Globe className="filliny-h-5 filliny-w-5 filliny-text-primary" />
                <CardTitle className="filliny-text-base">Add Your First Website</CardTitle>
              </div>
              <CardDescription>
                Choose websites where you want Filliny to help fill forms. Pick from popular sites below or add your
                own.
              </CardDescription>
            </CardHeader>
            <CardContent className="filliny-pt-0">
              <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-text-xs filliny-text-muted-foreground">
                <Sparkles className="filliny-h-3.5 filliny-w-3.5 filliny-text-success" />
                <span>Tip: Start with websites you use most often</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Websites - Horizontal Scroll */}
        <div className="filliny-w-full filliny-min-w-0 filliny-shrink-0">
          <ScrollArea className="filliny-w-full filliny-max-w-full">
            <div className="filliny-w-full filliny-overflow-x-auto">
              <RecommendedWebsites onWebsiteSelect={handleWebsiteSelect} hasReachedLimit={websitesReachedLimit} />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Website Cards */}
        <div className="filliny-flex filliny-min-w-0 filliny-flex-col filliny-gap-3 filliny-overflow-hidden">
          {fields.map((item, index) => {
            const websiteValue = latestWebsiteValues?.[index];
            if (!websiteValue) return null;

            return (
              <WebsitePreviewCard
                key={item.id}
                defaultExpanded={item.isNew}
                isRootLoad={!!websiteValue.isRootLoad}
                websiteURL={websiteValue.websiteUrl}
                onRemove={() => remove(index)}>
                <WebsiteFormFields index={index} />
              </WebsitePreviewCard>
            );
          })}
        </div>
      </div>

      {/* Sticky Add Website Button */}
      <div className="filliny-sticky filliny-bottom-0 filliny-mt-4 filliny-border-t filliny-border-border filliny-bg-background filliny-pt-4">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="filliny-w-full">
                <Button
                  className="filliny-w-full filliny-gap-2"
                  onClick={handleAdd}
                  variant={hasNoWebsites ? 'default' : 'outline'}
                  disabled={websitesReachedLimit}>
                  <Plus className="filliny-h-4 filliny-w-4" />
                  {hasNoWebsites ? 'Add Your First Website' : 'Add Website'}
                </Button>
              </div>
            </TooltipTrigger>
            {websitesReachedLimit && (
              <TooltipContent className="filliny-max-w-xs filliny-p-3">
                <p className="filliny-text-sm">
                  You've reached the maximum of {maxWebsites} websites for your {currentPlan} plan. Upgrade to Pro for
                  more websites.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default StepperForm1;

// Re-export WebsiteFormFields for backward compatibility
export { WebsiteFormFields } from './WebsiteFormFields';
