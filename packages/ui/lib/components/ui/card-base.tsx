import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const cardBaseVariants = cva(
  'filliny-rounded-xl filliny-border filliny-bg-card filliny-text-card-foreground',
  {
    variants: {
      variant: {
        default: 'filliny-p-6 filliny-shadow-sm',
        feature: 'filliny-p-6 filliny-shadow-sm hover:filliny-shadow-md filliny-transition-shadow',
        step: 'filliny-p-6',
      },
      hover: {
        true: 'hover:filliny-bg-accent/50 filliny-transition-colors filliny-cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
    },
  }
);

interface CardBaseProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardBaseVariants> {}

const CardBase = React.forwardRef<HTMLDivElement, CardBaseProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div ref={ref} className={cn(cardBaseVariants({ variant, hover }), className)} {...props} />
  )
);
CardBase.displayName = 'CardBase';

const cardIconVariants = cva(
  'filliny-flex filliny-items-center filliny-justify-center filliny-rounded-lg filliny-p-2',
  {
    variants: {
      variant: {
        default: 'filliny-bg-primary/10 filliny-text-primary',
        accent: 'filliny-bg-accent filliny-text-accent-foreground',
        step: 'filliny-bg-primary filliny-text-primary-foreground',
        success: 'filliny-bg-success/10 filliny-text-success',
        warning: 'filliny-bg-warning/10 filliny-text-warning',
        info: 'filliny-bg-info/10 filliny-text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface CardIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardIconVariants> {}

const CardIcon = React.forwardRef<HTMLDivElement, CardIconProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardIconVariants({ variant }), className)} {...props} />
  )
);
CardIcon.displayName = 'CardIcon';

const CardBaseTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('filliny-text-lg filliny-font-semibold filliny-text-foreground', className)}
      {...props}
    />
  )
);
CardBaseTitle.displayName = 'CardBaseTitle';

const CardBaseDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('filliny-text-sm filliny-text-muted-foreground filliny-leading-relaxed', className)}
    {...props}
  />
));
CardBaseDescription.displayName = 'CardBaseDescription';

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits?: string[];
}

const FeatureCard = ({ icon, title, description, benefits, className, ...props }: FeatureCardProps) => (
  <CardBase variant="feature" className={cn('filliny-space-y-4', className)} {...props}>
    <CardIcon>{icon}</CardIcon>
    <div className="filliny-space-y-2">
      <CardBaseTitle>{title}</CardBaseTitle>
      <CardBaseDescription>{description}</CardBaseDescription>
    </div>
    {benefits && benefits.length > 0 && (
      <ul className="filliny-space-y-1 filliny-text-sm filliny-text-muted-foreground">
        {benefits.map((benefit, index) => (
          <li key={index} className="filliny-flex filliny-items-center filliny-gap-2">
            <span className="filliny-h-1 filliny-w-1 filliny-rounded-full filliny-bg-primary" />
            {benefit}
          </li>
        ))}
      </ul>
    )}
  </CardBase>
);

interface StepCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  step: number;
  title: string;
  description: string;
  state?: 'default' | 'active' | 'completed';
}

const StepCard = ({
  icon,
  step,
  title,
  description,
  state = 'default',
  className,
  ...props
}: StepCardProps) => (
  <CardBase
    variant="step"
    className={cn(
      'filliny-space-y-4',
      state === 'active' && 'filliny-border-primary filliny-bg-primary/5',
      state === 'completed' && 'filliny-border-success filliny-bg-success/5',
      className
    )}
    {...props}
  >
    <div className="filliny-flex filliny-items-center filliny-gap-3">
      <CardIcon variant={state === 'completed' ? 'success' : state === 'active' ? 'step' : 'default'}>
        {icon}
      </CardIcon>
      <span className="filliny-text-sm filliny-font-medium filliny-text-muted-foreground">
        Step {step}
      </span>
    </div>
    <div className="filliny-space-y-2">
      <CardBaseTitle>{title}</CardBaseTitle>
      <CardBaseDescription>{description}</CardBaseDescription>
    </div>
  </CardBase>
);

export {
  CardBase,
  cardBaseVariants,
  CardIcon,
  cardIconVariants,
  CardBaseTitle,
  CardBaseDescription,
  FeatureCard,
  StepCard,
};
export type { CardBaseProps, CardIconProps, FeatureCardProps, StepCardProps };
