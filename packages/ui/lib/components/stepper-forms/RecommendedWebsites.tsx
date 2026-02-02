import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { getFaviconUrl, useSuggestedWebsites } from '@extension/shared';

interface RecommendedWebsitesProps {
  onWebsiteSelect: (value: string) => void;
  hasReachedLimit: boolean;
}

/**
 * Displays recommended websites as badges with favicons.
 * Users can click on a badge to select that website.
 */
export const RecommendedWebsites = ({ onWebsiteSelect, hasReachedLimit }: RecommendedWebsitesProps) => {
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
        <TooltipProvider key={String(item.id)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'filliny-flex filliny-items-center filliny-gap-1',
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
