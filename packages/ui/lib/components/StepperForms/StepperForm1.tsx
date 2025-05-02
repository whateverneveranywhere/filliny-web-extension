import React, { useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { WebsitePreviewCard } from "./WebsitePreviewCard";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { RHFShadcnCheckbox, RHFShadcnTextField, RHFShadcnTextarea } from "../RHF";
import { getFaviconUrl, useSuggestedWebsites, usePlanLimits, getConfig } from "@extension/shared";
import type { ProfileFormTypes } from "@/lib/containers/profile-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "../alerts";

// Get base URL for example placeholder
const config = getConfig();
const baseExampleURL = config.baseURL;

// Separate component for recommended websites section
const RecommendedWebsites = ({
  onWebsiteSelect,
  hasReachedLimit,
}: {
  onWebsiteSelect: (value: string) => void;
  hasReachedLimit: boolean;
}) => {
  const { data: recommendedWebsites, isLoading } = useSuggestedWebsites();

  if (isLoading) {
    return <span className="filliny-text-muted-foreground">Loading recommendations...</span>;
  }

  if (!recommendedWebsites?.length) {
    return <span className="filliny-text-muted-foreground">No recommendations available</span>;
  }

  return (
    <div className="filliny-flex filliny-w-max filliny-space-x-1">
      {recommendedWebsites.map(item => (
        <TooltipProvider key={String(item.id)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "filliny-flex filliny-items-center filliny-gap-1",
                  hasReachedLimit
                    ? "filliny-cursor-not-allowed filliny-opacity-50"
                    : "filliny-cursor-pointer hover:filliny-bg-accent",
                )}
                onClick={() => !hasReachedLimit && onWebsiteSelect(item.value)}>
                <img
                  src={getFaviconUrl(item.value)}
                  alt={`${item.label} favicon`}
                  width={15}
                  height={15}
                  className="filliny-rounded"
                />
                {item.label}
              </Badge>
            </TooltipTrigger>
            {hasReachedLimit && (
              <TooltipContent>
                <p>Upgrade your plan to add more websites</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

// Separate component for website form fields
export const WebsiteFormFields = ({ index }: { index: number }) => (
  <div className="filliny-grid filliny-gap-4">
    <RHFShadcnTextField
      placeholder={baseExampleURL}
      name={`fillingWebsites[${index}].websiteUrl`}
      title="Website's URL"
    />
    <RHFShadcnCheckbox
      name={`fillingWebsites[${index}].isRootLoad`}
      title="Load it in the entire website instead of the exact given URL"
    />
    <RHFShadcnTextarea
      name={`fillingWebsites[${index}].fillingContext`}
      title="Filling context"
      placeholder="Enter any specific instructions or context for filling this website's forms"
    />
  </div>
);

function StepperForm1() {
  const { control, watch } = useFormContext<ProfileFormTypes>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "fillingWebsites",
  });
  const { currentPlan, maxWebsites, hasReachedLimit } = usePlanLimits();
  const websitesReachedLimit = hasReachedLimit(fields.length);

  const handleAdd = useCallback(() => {
    if (websitesReachedLimit) return;

    append({
      fillingContext: "",
      isRootLoad: true,
      websiteUrl: "",
      isNew: true,
    });
  }, [append, websitesReachedLimit]);

  const handleWebsiteSelect = useCallback(
    (websiteUrl: string) => {
      if (websitesReachedLimit) return;

      append({
        fillingContext: "",
        isRootLoad: true,
        websiteUrl,
        isNew: false,
      });
    },
    [append, websitesReachedLimit],
  );

  const latestWebsiteValues = watch("fillingWebsites");

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-4">
      {websitesReachedLimit && <UpgradeBanner />}

      <ScrollArea className="filliny-w-full">
        <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-pb-3">
          <span className="filliny-whitespace-nowrap filliny-font-medium">Recommended websites:</span>
          <RecommendedWebsites onWebsiteSelect={handleWebsiteSelect} hasReachedLimit={websitesReachedLimit} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="filliny-space-y-3">
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

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="filliny-w-full">
              <Button
                className="filliny-mt-2 filliny-w-full"
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
                You've reached the maximum number of websites for your {currentPlan} plan. Upgrade to add more websites
                and unlock additional features.
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default StepperForm1;
