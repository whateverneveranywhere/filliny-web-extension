import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui';
import { cva, type VariantProps } from 'class-variance-authority';

const alertVariants = cva('filliny-rounded-lg filliny-border filliny-p-4', {
  variants: {
    variant: {
      default: 'filliny-border-primary/20 filliny-bg-primary/5',
      destructive: 'filliny-border-destructive/20 filliny-bg-destructive/5',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const titleVariants = cva('filliny-text-lg filliny-font-medium', {
  variants: {
    variant: {
      default: 'filliny-text-primary',
      destructive: 'filliny-text-primary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface AlertProps extends VariantProps<typeof alertVariants> {
  title: string;
  description: string;
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onButtonClick?: () => void;
}

export function Alert({
  title,
  description,
  buttonText,
  buttonIcon: ButtonIcon,
  onButtonClick,
  variant = 'default',
}: AlertProps) {
  return (
    <div className={alertVariants({ variant })}>
      <div className="filliny-flex filliny-items-center filliny-justify-between filliny-gap-5">
        <div className="filliny-flex filliny-flex-col filliny-gap-1">
          <p className={titleVariants({ variant })}>{title}</p>
          <p className="filliny-text-sm filliny-text-muted-foreground">{description}</p>
        </div>
        {buttonText && (
          <Button variant={variant} size="sm" className="filliny-gap-1.5" onClick={onButtonClick}>
            {buttonText}
            {ButtonIcon && <ButtonIcon className="filliny-h-3.5 filliny-w-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}
