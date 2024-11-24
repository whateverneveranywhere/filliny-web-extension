/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { ChevronDown, ChevronUp, Loader2, Globe, ExternalLink, Trash } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@extension/shared';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';

interface Props {
  websiteURL: string;
  isRootLoad: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  defaultExpanded?: boolean;
  hideExpandTrigger?: boolean;
  className?: string;
  onRemove?: () => void;
}

const getFormattedURL = (url: string, rootLoad: boolean) => {
  try {
    const { hostname, pathname } = new URL(url);
    return rootLoad ? `*.${hostname}/*` : `${hostname}${pathname}`;
  } catch {
    return url;
  }
};

function WebsitePreviewCard({
  websiteURL,
  isLoading = false,
  isRootLoad,
  children,
  actions,
  defaultExpanded = true,
  hideExpandTrigger = false,
  className,
  onRemove,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [faviconError, setFaviconError] = useState(false);

  const formattedURL = getFormattedURL(websiteURL, isRootLoad);
  const isValidURL = websiteURL && websiteURL !== 'about:blank';

  const handleVisitWebsite = () => {
    if (isValidURL) {
      window.open(websiteURL, '_blank');
    }
  };

  return (
    <Card className={cn('w-full transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader className="filliny-space-y-0 !filliny-p-0.5">
        <CardTitle className="filliny-flex filliny-w-full filliny-items-center filliny-gap-4 !filliny-p-0">
          {/* Favicon Section */}
          <div className="filliny-shrink-0">
            {isLoading ? (
              <Skeleton className="filliny-h-10 filliny-w-10 filliny-rounded-md" />
            ) : isValidURL && !faviconError ? (
              <img
                src={getFaviconUrl(websiteURL)}
                alt="Website favicon"
                width={40}
                height={40}
                className="filliny-rounded-md filliny-object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <div className="filliny-flex filliny-h-10 filliny-w-10 filliny-items-center filliny-justify-center filliny-rounded-md filliny-bg-muted">
                <Globe className="filliny-h-6 filliny-w-6 filliny-text-muted-foreground" />
              </div>
            )}
          </div>

          {/* URL Section with better truncation */}
          <div className="filliny-flex filliny-min-w-0 filliny-flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'filliny-flex filliny-items-center filliny-gap-2 filliny-w-full filliny-flex-nowrap',
                      isValidURL && 'filliny-cursor-pointer filliny-hover:filliny-text-primary',
                    )}
                    onClick={handleVisitWebsite}>
                    <span className="filliny-truncate filliny-text-sm filliny-font-medium">
                      {formattedURL || 'Enter website URL'}
                    </span>
                    {isValidURL && (
                      <ExternalLink className="filliny-h-4 filliny-w-4 filliny-shrink-0 filliny-text-muted-foreground" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="filliny-text-sm">{isValidURL ? websiteURL : 'No valid URL provided'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Actions Section */}
          <div className="filliny-flex filliny-shrink-0 filliny-items-center filliny-gap-2">
            {isLoading ? (
              <Loader2 className="filliny-h-5 filliny-w-5 filliny-animate-spin filliny-text-muted-foreground" />
            ) : (
              <>
                {!hideExpandTrigger && children && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="filliny-hover:filliny-bg-muted filliny-h-8 filliny-w-8">
                    {isExpanded ? (
                      <ChevronUp className="filliny-h-4 filliny-w-4" />
                    ) : (
                      <ChevronDown className="filliny-h-4 filliny-w-4" />
                    )}
                  </Button>
                )}
                {onRemove && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={onRemove}
                    className="filliny-hover:filliny-bg-destructive/10 filliny-hover:filliny-text-destructive filliny-h-8 filliny-w-8 filliny-text-destructive">
                    <Trash className="filliny-h-4 filliny-w-4" />
                  </Button>
                )}
                {actions}
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && children && (
        <CardContent className={cn('p-4 pt-0', 'animate-in fade-in-0 slide-in-from-top-2 duration-200')}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export { WebsitePreviewCard };
