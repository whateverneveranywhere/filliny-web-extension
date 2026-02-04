import { ShadowTooltip, ShadowTooltipContent, ShadowTooltipProvider, ShadowTooltipTrigger } from './shadow-tooltip';
import { easings, durations } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { useState, useRef, useLayoutEffect } from 'react';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';

const shadowTogglePillVariants = cva(
  'filliny-relative filliny-flex filliny-items-center filliny-rounded-full filliny-shadow-md filliny-overflow-hidden filliny-transition-colors filliny-duration-200',
  {
    variants: {
      variant: {
        default: 'filliny-bg-primary/10',
        outline: 'filliny-border filliny-border-primary/20 filliny-bg-background',
      },
      size: {
        default: 'filliny-h-10 filliny-p-1',
        sm: 'filliny-h-8 filliny-p-0.5',
        lg: 'filliny-h-12 filliny-p-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const shadowTogglePillOptionVariants = cva(
  'filliny-flex filliny-items-center filliny-justify-center filliny-rounded-full filliny-text-sm filliny-font-medium filliny-transition-colors filliny-z-10 filliny-relative',
  {
    variants: {
      variant: {
        default: 'filliny-text-muted-foreground data-[state=active]:filliny-text-primary-foreground',
        outline: 'filliny-text-muted-foreground data-[state=active]:filliny-text-primary',
      },
      size: {
        default: 'filliny-px-4 filliny-py-1.5 filliny-text-sm',
        sm: 'filliny-px-3 filliny-py-1 filliny-text-xs',
        lg: 'filliny-px-5 filliny-py-2 filliny-text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ShadowTogglePillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof shadowTogglePillVariants> {
  value: string;
  onValueChange: (value: string) => void;
  options: {
    value: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    tooltip?: string;
  }[];
  disabled?: boolean;
}

const ShadowTogglePill = React.forwardRef<HTMLDivElement, ShadowTogglePillProps>(
  ({ className, variant, size, value, onValueChange, options, disabled = false, ...props }, ref) => {
    const activeIndex = options.findIndex(option => option.value === value);
    const containerRef = useRef<HTMLDivElement>(null);
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

    // Calculate highlight position based on active index
    useLayoutEffect(() => {
      if (activeIndex === -1 || !containerRef.current) return;

      const buttons = containerRef.current.querySelectorAll('button');
      const activeButton = buttons[activeIndex];

      if (activeButton) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        setHighlightStyle({
          width: `${buttonRect.width}px`,
          transform: `translateX(${buttonRect.left - containerRect.left}px)`,
          transition: `transform ${durations.default}ms ${easings.spring}, width ${durations.default}ms ${easings.spring}`,
        });
      }
    }, [activeIndex, options.length]);

    return (
      <div
        ref={ref}
        className={cn(
          shadowTogglePillVariants({ variant, size, className }),
          disabled && 'filliny-opacity-60 filliny-pointer-events-none',
        )}
        {...props}>
        {/* Background highlight - using CSS transform for smooth animation */}
        {activeIndex !== -1 && (
          <div
            className="filliny-absolute filliny-top-1 filliny-bottom-1 filliny-left-0 filliny-rounded-full filliny-bg-primary"
            style={{
              ...highlightStyle,
              willChange: 'transform, width',
            }}
          />
        )}

        {/* Options */}
        <div
          ref={containerRef}
          className="filliny-relative filliny-flex filliny-w-full filliny-items-stretch filliny-justify-between">
          {options.map(option => (
            <ShadowTooltipProvider key={option.value} delayDuration={300}>
              <ShadowTooltip>
                <ShadowTooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onValueChange(option.value)}
                    disabled={disabled}
                    data-state={value === option.value ? 'active' : 'inactive'}
                    className={cn(
                      shadowTogglePillOptionVariants({ variant, size }),
                      'filliny-flex-1 filliny-inline-flex',
                      value === option.value && 'filliny-text-primary-foreground',
                    )}>
                    <span className="filliny-flex filliny-items-center filliny-justify-center filliny-gap-1.5 filliny-w-full">
                      {option.icon && (
                        <span className="filliny-flex-shrink-0 filliny-flex filliny-items-center filliny-justify-center filliny-size-4">
                          {option.icon}
                        </span>
                      )}
                      <span className="filliny-truncate">{option.label}</span>
                    </span>
                  </button>
                </ShadowTooltipTrigger>
                {option.tooltip && (
                  <ShadowTooltipContent side="top" className="filliny-z-[99999]">
                    <p>{option.tooltip}</p>
                  </ShadowTooltipContent>
                )}
              </ShadowTooltip>
            </ShadowTooltipProvider>
          ))}
        </div>
      </div>
    );
  },
);

ShadowTogglePill.displayName = 'ShadowTogglePill';

export { ShadowTogglePill };
export type { ShadowTogglePillProps };
