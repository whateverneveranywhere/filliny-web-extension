/* eslint-disable react/no-unescaped-entities */
import { Plus, AlertCircle } from 'lucide-react';
import React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '../components';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import { useActiveTabUrl } from '@extension/shared';

interface Props {
  onQuickAdd: () => void;
  isLoading: boolean;
}

function QuickAddWebsiteToProfile({ onQuickAdd, isLoading }: Props) {
  const { url, isLoading: isLoadingUrl, isValid } = useActiveTabUrl();

  const isDisabled = isLoading || isLoadingUrl || !url || !isValid;

  if (!isValid && url) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="filliny-h-4 filliny-w-4" />
        <AlertDescription>
          Invalid URL detected: {url}
          <br />
          Please make sure you're on a valid website.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="filliny-flex filliny-w-full filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4">
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
                <Button
                  size="icon"
                  variant={isDisabled ? 'ghost' : 'default'}
                  onClick={onQuickAdd}
                  disabled={isDisabled}
                  className="filliny-transition-all hover:filliny-scale-105">
                  <Plus />
                </Button>
              }
            />
            {isLoadingUrl && (
              <p className="filliny-text-sm filliny-text-muted-foreground filliny-text-center">
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
