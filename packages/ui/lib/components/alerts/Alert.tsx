import { Button } from '../ui';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';

const alertVariants = cva('filliny-rounded-lg filliny-border filliny-p-4 filliny-bg-background', {
  variants: {
    variant: {
      default: 'filliny-border-primary/30',
      destructive: 'filliny-border-destructive/30',
      warning: 'filliny-border-warning/50',
      success: 'filliny-border-success/30',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const titleVariants = cva('filliny-text-sm filliny-font-semibold', {
  variants: {
    variant: {
      default: 'filliny-text-primary',
      destructive: 'filliny-text-destructive',
      warning: 'filliny-text-warning',
      success: 'filliny-text-success',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const buttonVariantMap = {
  default: 'default',
  destructive: 'destructive',
  warning: 'warning',
  success: 'success',
} as const;

interface AlertProps extends VariantProps<typeof alertVariants> {
  title: string;
  description: string;
  icon?: LucideIcon;
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onButtonClick?: () => void;
}

export const Alert = ({
  title,
  description,
  icon: Icon,
  buttonText,
  buttonIcon: ButtonIcon,
  onButtonClick,
  variant = 'default',
}: AlertProps) => (
  <div className={alertVariants({ variant })}>
    <div className="filliny-flex filliny-flex-col filliny-gap-3">
      <div className="filliny-flex filliny-items-start filliny-gap-3">
        {Icon && (
          <div className="filliny-mt-0.5 filliny-shrink-0">
            <Icon className="filliny-h-4 filliny-w-4" />
          </div>
        )}
        <div className="filliny-flex filliny-flex-col filliny-gap-1.5">
          <p className={titleVariants({ variant })}>{title}</p>
          <p className="filliny-text-sm filliny-text-muted-foreground">{description}</p>
        </div>
      </div>
      {buttonText && (
        <Button
          variant={buttonVariantMap[variant || 'default']}
          size="sm"
          className="filliny-w-full filliny-gap-1.5"
          onClick={onButtonClick}>
          {buttonText}
          {ButtonIcon && <ButtonIcon className="filliny-h-3.5 filliny-w-3.5" />}
        </Button>
      )}
    </div>
  </div>
);
