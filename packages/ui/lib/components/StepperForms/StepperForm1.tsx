import React, { useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { WebsitePreviewCard } from './WebsitePreviewCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { RHFShadcnCheckbox, RHFShadcnTextField, RHFShadcnTextarea } from '../RHF';
import { getFaviconUrl, useSuggestedWebsites } from '@extension/shared';
import type { ProfileFormTypes } from '@/lib/containers/profile-form';

// Separate component for recommended websites section
const RecommendedWebsites = ({ onWebsiteSelect }: { onWebsiteSelect: (value: string) => void }) => {
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
        <Badge
          key={String(item.id)}
          variant="outline"
          className="filliny-flex filliny-cursor-pointer filliny-items-center filliny-gap-1 hover:filliny-bg-accent"
          onClick={() => onWebsiteSelect(item.value)}>
          <img
            src={getFaviconUrl(item.value)}
            alt={`${item.label} favicon`}
            width={15}
            height={15}
            className="filliny-rounded"
          />
          {item.label}
        </Badge>
      ))}
    </div>
  );
};

// Separate component for website form fields
const WebsiteFormFields = ({ index }: { index: number }) => (
  <div className="filliny-grid filliny-gap-4">
    <RHFShadcnTextField
      placeholder="https://filliny.io"
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
    name: 'fillingWebsites',
  });

  const handleAdd = useCallback(() => {
    append({
      fillingContext: '',
      isRootLoad: true,
      websiteUrl: '',
      isNew: true,
    });
  }, [append]);

  const handleWebsiteSelect = useCallback(
    (websiteUrl: string) => {
      append({
        fillingContext: '',
        isRootLoad: true,
        websiteUrl,
        isNew: false,
      });
    },
    [append],
  );

  const latestWebsiteValues = watch('fillingWebsites');

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-4">
      <ScrollArea className="filliny-w-full">
        <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-pb-3">
          <span className="filliny-whitespace-nowrap filliny-font-medium">Recommended websites:</span>
          <RecommendedWebsites onWebsiteSelect={handleWebsiteSelect} />
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

      <Button className="filliny-mt-2" onClick={handleAdd} variant="outline">
        <Plus className="filliny-mr-2 filliny-h-4 filliny-w-4" />
        Add Website
      </Button>
    </div>
  );
}

export default StepperForm1;
