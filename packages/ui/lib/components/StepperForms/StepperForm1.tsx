import React, { useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { WebsitePreviewCard } from './WebsitePreviewCard';
import { Button } from '../ui/button';
import { Plus, Trash } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { RHFShadcnCheckbox, RHFShadcnTextField, RHFShadcnTextarea } from '../RHF';
import { getFaviconUrl, useSuggestedWebsites } from '@extension/shared';
import type { DTOFillingProfileForm } from '@/lib/containers/profile-form';

function StepperForm1() {
  const { data: recommendedWebsites, isLoading: isLoadingSuggestedWebsites } = useSuggestedWebsites();
  const { control, watch } = useFormContext<DTOFillingProfileForm>();
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

  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const latestWebsiteValues = watch('fillingWebsites');

  return (
    <>
      <ScrollArea className="filliny-mb-2 filliny-w-full filliny-whitespace-nowrap">
        <div className="filliny-flex filliny-items-center filliny-justify-start filliny-gap-1 filliny-whitespace-nowrap filliny-pb-3">
          Recommended websites:{' '}
          {isLoadingSuggestedWebsites ? (
            'loading...'
          ) : (
            <div className="filliny-flex filliny-w-max filliny-space-x-1">
              {recommendedWebsites?.map(item => (
                <Badge
                  key={String(item.id)}
                  variant="outline"
                  className="filliny-flex filliny-cursor-pointer filliny-items-center filliny-justify-center filliny-gap-1"
                  onClick={() => {
                    append({
                      fillingContext: '',
                      isRootLoad: true,
                      websiteUrl: item.value,
                      isNew: false,
                    });
                  }}>
                  <img
                    src={getFaviconUrl(item.value)}
                    alt="favicon"
                    width={15}
                    height={15}
                    className="filliny-rounded"
                  />
                  {item.label}
                </Badge>
              ))}
            </div>
          )}
        </div>{' '}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-2">
        {fields.map(
          (item, index) =>
            latestWebsiteValues && (
              <WebsitePreviewCard
                defaultExpanded={item.isNew}
                key={item.id}
                isRootLoad={!!latestWebsiteValues[index].isRootLoad}
                websiteURL={latestWebsiteValues[index].websiteUrl}
                actions={
                  <>
                    <Button size="icon" variant="ghost" onClick={() => handleRemove(index)}>
                      <Trash className="filliny-text-red-500" />
                    </Button>
                  </>
                }>
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
                  <RHFShadcnTextarea name={`fillingWebsites[${index}].fillingContext`} title="Filling context" />
                </div>
              </WebsitePreviewCard>
            ),
        )}
      </div>
      <Button className="filliny-mt-5 filliny-w-full" onClick={handleAdd}>
        <Plus /> Add a new website to this profile
      </Button>
    </>
  );
}

export default StepperForm1;
