import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { getFaviconUrl, useSuggestedWebsites } from '@extension/shared';

interface RecommendedWebsitesProps {
  onWebsiteSelect: (value: string) => void;
  hasReachedLimit: boolean;
}

/**
 * Loading skeleton for recommended websites
 */
const RecommendedWebsitesSkeleton = () => (
  <ScrollArea className="filliny-w-full filliny-whitespace-nowrap">
    <div className="filliny-flex filliny-w-max filliny-gap-1.5 filliny-py-1">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="filliny-h-6 filliny-w-20 filliny-shrink-0 filliny-rounded-full" />
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

/**
 * Displays recommended websites as badges with favicons.
 * Users can click on a badge to select that website.
 */
export const RecommendedWebsites = ({ onWebsiteSelect, hasReachedLimit }: RecommendedWebsitesProps) => {
  const { data: recommendedWebsites, isLoading, isError, error } = useSuggestedWebsites();

  if (isLoading) {
    return <RecommendedWebsitesSkeleton />;
  }

  if (isError) {
    console.error('Failed to load suggested websites:', error);
    return <span className="filliny-text-sm filliny-text-muted-foreground">Unable to load recommendations</span>;
  }

  if (!recommendedWebsites?.length) {
    return <span className="filliny-text-sm filliny-text-muted-foreground">No recommendations available</span>;
  }

  return (
    <ScrollArea className="filliny-w-full filliny-whitespace-nowrap">
      <div className="filliny-flex filliny-w-max filliny-gap-1.5 filliny-py-1">
        {recommendedWebsites.map(item => (
          <TooltipProvider key={String(item.id)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'filliny-flex filliny-shrink-0 filliny-cursor-pointer filliny-items-center filliny-gap-1.5 filliny-px-2.5 filliny-py-1 filliny-transition-colors',
                    hasReachedLimit ? 'filliny-cursor-not-allowed filliny-opacity-50' : 'hover:filliny-bg-accent',
                  )}
                  onClick={() => !hasReachedLimit && onWebsiteSelect(item.value)}>
                  <img
                    src={getFaviconUrl(item.value)}
                    alt={`${item.label} favicon`}
                    width={14}
                    height={14}
                    className="filliny-rounded-sm"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="filliny-text-xs">{item.label}</span>
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
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
