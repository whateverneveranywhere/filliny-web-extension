import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import { Logo } from '../Logo';
import { getFaviconUrl } from '@extension/shared';

interface Props {
  websiteURL: string;
  isRootLoad: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  defaultExpanded?: boolean;
  hideExpandTrigger?: boolean;
}

const getFormattedURL = (url: string, rootLoad: boolean) => {
  try {
    const { hostname } = new URL(url);
    return rootLoad ? `*.${hostname}/*` : url;
  } catch {
    return url;
  }
};

function WebsitePreviewCard(props: Props) {
  const {
    websiteURL,
    isLoading = false,
    isRootLoad,
    children,
    actions,
    defaultExpanded = true,
    hideExpandTrigger = false,
  } = props;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [faviconError, setFaviconError] = useState(false);

  return (
    <>
      <Card className={cn('w-full')}>
        <CardHeader className="filliny-px-4 filliny-py-3">
          <CardTitle className="filliny-grid filliny-grid-cols-4 filliny-items-center">
            <div className="filliny-col-span-3 filliny-flex filliny-items-center filliny-gap-2">
              {websiteURL && !faviconError ? (
                <img
                  src={getFaviconUrl(websiteURL)}
                  alt="favicon"
                  width={40}
                  height={40}
                  className="filliny-rounded"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <Logo />
              )}{' '}
              <p className="filliny-w-full filliny-truncate filliny-text-sm">
                {' '}
                {getFormattedURL(websiteURL, isRootLoad) || "website's URL here"}
              </p>
            </div>
            <div className="filliny-col-span-1 filliny-flex filliny-items-center filliny-justify-end">
              {!isLoading && (
                <>
                  {!hideExpandTrigger && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  )}

                  {actions}
                </>
              )}

              {isLoading && <Loader2 className={cn('filliny-h-10 filliny-w-10 filliny-animate-spin')} />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && children && <CardContent className="filliny-px-4 filliny-pb-4">{children}</CardContent>}
      </Card>
    </>
  );
}

export { WebsitePreviewCard };
