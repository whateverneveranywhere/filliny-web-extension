import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { animationClasses } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@extension/shared';
import { ChevronDown, ChevronUp, Loader2, Globe, ExternalLink, Trash } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';

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

const WebsitePreviewCard = ({
  websiteURL,
  isLoading = false,
  isRootLoad,
  children,
  actions,
  defaultExpanded = true,
  hideExpandTrigger = false,
  className,
  onRemove,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [faviconError, setFaviconError] = useState(false);

  const formattedURL = getFormattedURL(websiteURL, isRootLoad);
  const isValidURL = websiteURL && websiteURL !== 'about:blank';

  const handleVisitWebsite = () => {
    if (isValidURL) {
      window.open(websiteURL, '_blank');
    }
  };

  const handleVisitKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleVisitWebsite();
    }
  };

  return (
    <div
      className={cn(
        'filliny-flex filliny-w-full filliny-min-w-0 filliny-flex-col filliny-overflow-hidden filliny-rounded-lg filliny-border filliny-border-border filliny-bg-card filliny-text-card-foreground filliny-transition-all filliny-duration-200 hover:filliny-border-primary/20 hover:filliny-shadow-md',
        animationClasses.transition,
        className,
      )}>
      <div className="filliny-flex filliny-w-full filliny-min-w-0 filliny-items-center filliny-gap-2 filliny-p-2.5">
        {/* Favicon Section */}
        <div className="filliny-shrink-0">
          {isLoading ? (
            <Skeleton className="filliny-h-7 filliny-w-7 filliny-rounded-md" />
          ) : isValidURL && !faviconError ? (
            <img
              src={getFaviconUrl(websiteURL)}
              alt="Website favicon"
              width={28}
              height={28}
              className="filliny-rounded-md filliny-object-contain"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className="filliny-flex filliny-h-7 filliny-w-7 filliny-items-center filliny-justify-center filliny-rounded-md filliny-bg-muted">
              <Globe className="filliny-h-4 filliny-w-4 filliny-text-muted-foreground" />
            </div>
          )}
        </div>

        {/* URL Section - fit content width, doesn't fill entire row */}
        <div className="filliny-flex-1 filliny-min-w-0 filliny-overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'filliny-inline-flex filliny-max-w-full filliny-items-center filliny-gap-1',
                    isValidURL && 'filliny-cursor-pointer hover:filliny-text-primary',
                  )}
                  role={isValidURL ? 'link' : undefined}
                  tabIndex={isValidURL ? 0 : undefined}
                  onClick={handleVisitWebsite}
                  onKeyDown={handleVisitKeyDown}>
                  <span className="filliny-truncate filliny-text-sm filliny-font-medium">
                    {formattedURL || 'Enter website URL'}
                  </span>
                  {isValidURL && (
                    <ExternalLink className="filliny-h-3 filliny-w-3 filliny-shrink-0 filliny-text-muted-foreground" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="filliny-max-w-xs">
                <div className="filliny-flex filliny-flex-col filliny-gap-1">
                  <p className="filliny-break-all filliny-text-sm">
                    {isValidURL ? websiteURL : 'No valid URL provided'}
                  </p>
                  {isValidURL && (
                    <p className="filliny-text-xs filliny-text-muted-foreground">
                      {isRootLoad ? 'Applies to entire website' : 'Applies to this exact URL only'}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Actions Section */}
        <div className="filliny-flex filliny-shrink-0 filliny-items-center filliny-gap-1">
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
                  className="filliny-h-7 filliny-w-7 hover:filliny-bg-muted">
                  {isExpanded ? (
                    <ChevronUp className="filliny-h-3.5 filliny-w-3.5" />
                  ) : (
                    <ChevronDown className="filliny-h-3.5 filliny-w-3.5" />
                  )}
                </Button>
              )}
              {onRemove && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={onRemove}
                  className="filliny-h-7 filliny-w-7 filliny-text-destructive hover:filliny-bg-destructive/10 hover:filliny-text-destructive">
                  <Trash className="filliny-h-3.5 filliny-w-3.5" />
                </Button>
              )}
              {actions}
            </>
          )}
        </div>
      </div>

      {isExpanded && children && (
        <div
          className={cn(
            'filliny-border-t filliny-border-border filliny-px-2.5 filliny-py-2.5',
            animationClasses.slideInTop,
          )}>
          {children}
        </div>
      )}
    </div>
  );
};

export { WebsitePreviewCard };
