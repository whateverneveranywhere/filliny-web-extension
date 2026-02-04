import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { CheckCircle, Circle } from 'lucide-react';

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  className?: string;
}

/**
 * OnboardingProgress - Visual progress indicator for new user onboarding
 *
 * Shows the user their progress through the onboarding flow.
 * Encourages completion by showing how close they are to getting started.
 */
const OnboardingProgress = ({ steps, className }: OnboardingProgressProps) => {
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className={className}>
      <div className="filliny-flex filliny-items-center filliny-justify-between filliny-gap-2 filliny-mb-2">
        <span className="filliny-text-xs filliny-font-medium filliny-text-foreground">Getting Started</span>
        <Badge variant={progressPercent === 100 ? 'success' : 'secondary'} className="filliny-text-xs">
          {completedCount}/{steps.length}
        </Badge>
      </div>
      <Progress value={progressPercent} className="filliny-h-1.5 filliny-mb-3" />
      <div className="filliny-flex filliny-flex-col filliny-gap-1.5">
        {steps.map(step => (
          <div key={step.id} className="filliny-flex filliny-items-center filliny-gap-2">
            {step.completed ? (
              <CheckCircle className="filliny-h-3.5 filliny-w-3.5 filliny-text-success filliny-shrink-0" />
            ) : (
              <Circle className="filliny-h-3.5 filliny-w-3.5 filliny-text-muted-foreground/50 filliny-shrink-0" />
            )}
            <span
              className={`filliny-text-xs ${step.completed ? 'filliny-text-muted-foreground filliny-line-through' : 'filliny-text-foreground'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { OnboardingProgress };
export type { OnboardingStep, OnboardingProgressProps };
