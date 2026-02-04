import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, PartyPopper, ArrowRight, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CelebrationType = 'profile-created' | 'website-added' | 'first-fill' | 'onboarding-complete' | 'custom';

interface SuccessCelebrationProps {
  type: CelebrationType;
  title?: string;
  description?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Auto-dismiss callback */
  onDismiss?: () => void;
  className?: string;
}

/**
 * SuccessCelebration - Celebrate user achievements
 *
 * Shows when users complete key actions to provide positive reinforcement
 * and guide them to their next step.
 *
 * Marketing principles:
 * - Positive reinforcement for engagement
 * - Clear next steps to maintain momentum
 * - Celebratory tone to build product affinity
 */
const SuccessCelebration = ({
  type,
  title: customTitle,
  description: customDescription,
  primaryAction,
  secondaryAction,
  onDismiss,
  className,
}: SuccessCelebrationProps) => {
  const getCelebrationContent = () => {
    switch (type) {
      case 'profile-created':
        return {
          icon: PartyPopper,
          title: 'Profile Created!',
          description: 'Your new profile is ready. Add websites to start filling forms with AI.',
          gradient: 'filliny-from-success/20 filliny-to-success/5',
          iconColor: 'filliny-text-success',
        };
      case 'website-added':
        return {
          icon: CheckCircle,
          title: 'Website Added!',
          description: "You're all set. Visit the website and Filliny will help you fill forms.",
          gradient: 'filliny-from-primary/20 filliny-to-primary/5',
          iconColor: 'filliny-text-primary',
        };
      case 'first-fill':
        return {
          icon: Zap,
          title: 'First Form Filled!',
          description: 'That was quick, right? Filliny learns from each form to get even better.',
          gradient: 'filliny-from-success/20 filliny-to-success/5',
          iconColor: 'filliny-text-success',
        };
      case 'onboarding-complete':
        return {
          icon: PartyPopper,
          title: "You're Ready!",
          description: 'Filliny is set up and ready to help you fill forms faster than ever.',
          gradient: 'filliny-from-primary/20 filliny-to-primary/5',
          iconColor: 'filliny-text-primary',
        };
      default:
        return {
          icon: CheckCircle,
          title: customTitle || 'Success!',
          description: customDescription || 'Action completed successfully.',
          gradient: 'filliny-from-success/20 filliny-to-success/5',
          iconColor: 'filliny-text-success',
        };
    }
  };

  const content = getCelebrationContent();
  const Icon = content.icon;
  const title = customTitle || content.title;
  const description = customDescription || content.description;

  return (
    <Card
      className={`filliny-border-0 filliny-bg-gradient-to-b filliny-backdrop-blur-sm ${content.gradient} ${className}`}>
      <CardHeader className="filliny-text-center filliny-pb-2">
        <div className="filliny-mx-auto filliny-mb-2 filliny-flex filliny-h-12 filliny-w-12 filliny-items-center filliny-justify-center filliny-rounded-full filliny-bg-background filliny-shadow-sm">
          <Icon className={`filliny-h-6 filliny-w-6 ${content.iconColor}`} />
        </div>
        <CardTitle className="filliny-text-base">{title}</CardTitle>
        <CardDescription className="filliny-text-balance">{description}</CardDescription>
      </CardHeader>
      {(primaryAction || secondaryAction || onDismiss) && (
        <CardContent className="filliny-flex filliny-flex-col filliny-gap-2 filliny-pt-0">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} className="filliny-w-full filliny-gap-1.5">
              {primaryAction.label}
              {primaryAction.icon ? (
                <primaryAction.icon className="filliny-h-4 filliny-w-4" />
              ) : (
                <ArrowRight className="filliny-h-4 filliny-w-4" />
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick} className="filliny-w-full">
              {secondaryAction.label}
            </Button>
          )}
          {onDismiss && !secondaryAction && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="filliny-w-full filliny-text-xs">
              Got it
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export { SuccessCelebration };
export type { SuccessCelebrationProps, CelebrationType };
