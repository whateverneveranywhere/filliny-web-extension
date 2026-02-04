import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Badge } from '../ui/badge';
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
  <div className="filliny-flex filliny-w-max filliny-flex-nowrap filliny-gap-1.5 filliny-pb-2">
    {[1, 2, 3].map(i => (
      <Skeleton key={i} className="filliny-h-6 filliny-w-20 filliny-shrink-0 filliny-rounded-full" />
    ))}
  </div>
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
    <div className="filliny-flex filliny-w-max filliny-flex-nowrap filliny-gap-1.5 filliny-pb-2">
      {recommendedWebsites.map(item => (
        <TooltipProvider key={String(item.id)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'filliny-flex filliny-shrink-0 filliny-items-center filliny-gap-1 filliny-whitespace-nowrap filliny-transition-colors',
                  hasReachedLimit
                    ? 'filliny-cursor-not-allowed filliny-opacity-50'
                    : 'filliny-cursor-pointer hover:filliny-bg-accent',
                )}
                onClick={() => !hasReachedLimit && onWebsiteSelect(item.value)}>
                <img
                  src={getFaviconUrl(item.value)}
                  alt={`${item.label} favicon`}
                  width={15}
                  height={15}
                  className="filliny-rounded"
                  onError={e => {
                    // Fallback to a default icon if favicon fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
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
