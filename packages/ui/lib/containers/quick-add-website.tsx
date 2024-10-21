import { Plus } from 'lucide-react';
import React from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';

interface Props {
  currentUrl: string;
  onQuickAdd: () => void;
  isLoading: boolean;
}

function QuickAddWebsiteToProfile(props: Props) {
  const { currentUrl, onQuickAdd, isLoading } = props;
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
              websiteURL={currentUrl}
              isRootLoad
              hideExpandTrigger
              isLoading={isLoading}
              actions={
                <>
                  <Button size="icon" variant="ghost" onClick={onQuickAdd}>
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
