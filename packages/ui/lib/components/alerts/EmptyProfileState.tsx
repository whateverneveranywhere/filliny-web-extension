import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getConfig, getFaviconUrl } from '@extension/shared';
import { ExternalLink, FolderPlus, Zap } from 'lucide-react';

interface EmptyProfileStateProps {
  onCreateProfile: () => void;
  onQuickStart: () => void;
  isLoading?: boolean;
  currentWebsiteUrl?: string;
  isCurrentWebsiteValid?: boolean;
}

/**
 * EmptyProfileState - Simple empty state for new users without profiles
 *
 * Shows when user has no filling profiles. Provides two clear options:
 * 1. Quick Start - One-click to enable Filliny on current website
 * 2. Create Custom Profile - Full customization flow for advanced users
 */
const EmptyProfileState = ({
  onCreateProfile,
  onQuickStart,
  isLoading = false,
  currentWebsiteUrl,
  isCurrentWebsiteValid = false,
}: EmptyProfileStateProps) => {
  const config = getConfig();

  // Get hostname from current URL for display
  const currentHostname = currentWebsiteUrl ? new URL(currentWebsiteUrl).hostname.replace('www.', '') : '';

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-4">
      {/* Enable on this website */}
      {isCurrentWebsiteValid && currentWebsiteUrl && (
        <Card className="filliny-w-full filliny-border-border">
          <CardHeader className="filliny-pb-2">
            <div className="filliny-flex filliny-items-center filliny-gap-2.5">
              <div className="filliny-flex filliny-h-8 filliny-w-8 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-primary/10">
                <Zap className="filliny-h-4 filliny-w-4 filliny-text-primary" />
              </div>
              <div className="filliny-flex-1">
                <CardTitle className="filliny-text-sm">Enable Filliny</CardTitle>
                <CardDescription className="filliny-text-xs">AI form filling on this website</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="filliny-flex filliny-flex-col filliny-gap-2.5 filliny-pt-0">
            <div className="filliny-flex filliny-items-center filliny-gap-2.5 filliny-rounded-lg filliny-border filliny-border-border/50 filliny-bg-muted/30 filliny-px-3 filliny-py-2">
              <img
                src={getFaviconUrl(currentWebsiteUrl)}
                alt="Current site favicon"
                width={20}
                height={20}
                className="filliny-rounded filliny-shrink-0"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="filliny-text-sm filliny-font-medium filliny-flex-1">{currentHostname}</span>
            </div>

            <Button
              size="sm"
              onClick={onQuickStart}
              disabled={isLoading}
              loading={isLoading}
              className="filliny-w-full">
              Enable on this website
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Custom Profile Card */}
      <Card className="filliny-w-full filliny-border-border/50 filliny-bg-card/30">
        <CardContent className="filliny-flex filliny-flex-col filliny-gap-3 filliny-py-3 filliny-px-4">
          <div className="filliny-flex filliny-items-center filliny-gap-3">
            <div className="filliny-flex filliny-h-8 filliny-w-8 filliny-shrink-0 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-muted">
              <FolderPlus className="filliny-h-4 filliny-w-4 filliny-text-muted-foreground" />
            </div>
            <div className="filliny-min-w-0">
              <p className="filliny-text-sm filliny-font-medium">Want more control?</p>
              <p className="filliny-text-xs filliny-text-muted-foreground">Customize your profile settings</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="filliny-w-full" onClick={onCreateProfile} disabled={isLoading}>
            Create Custom
          </Button>
        </CardContent>
      </Card>

      {/* Learn More Link */}
      <a
        href={`${config.baseURL}/getting-started`}
        target="_blank"
        rel="noopener noreferrer"
        className="filliny-flex filliny-items-center filliny-justify-center filliny-gap-1 filliny-text-xs filliny-text-muted-foreground filliny-transition-colors hover:filliny-text-foreground">
        Learn how Filliny works
        <ExternalLink className="filliny-h-3 filliny-w-3" />
      </a>
    </div>
  );
};

export { EmptyProfileState };
