import { Plus } from 'lucide-react';
import React from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import { useActiveTabUrl } from '@extension/shared';

interface Props {
  onQuickAdd: () => void;
  isLoading: boolean;
}

function QuickAddWebsiteToProfile({ onQuickAdd, isLoading }: Props) {
  const { url, isLoading: isLoadingUrl } = useActiveTabUrl();

  return (
    <div className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Want Filliny here?</CardTitle>
          <CardDescription>
            You can use this plus button to quickly add it to your current active profile!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-3">
            <WebsitePreviewCard
              websiteURL={url}
              isRootLoad
              hideExpandTrigger
              isLoading={isLoading || isLoadingUrl}
              actions={
                <>
                  <Button size="icon" variant="ghost" onClick={onQuickAdd} disabled={isLoading || isLoadingUrl || !url}>
                    <Plus />
                  </Button>
                </>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { QuickAddWebsiteToProfile };
