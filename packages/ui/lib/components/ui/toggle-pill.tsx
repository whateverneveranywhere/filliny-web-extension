import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";
import type { VariantProps } from "class-variance-authority";

const togglePillVariants = cva(
  "filliny-relative filliny-flex filliny-items-center filliny-rounded-full filliny-shadow-md filliny-overflow-hidden filliny-transition-colors filliny-duration-200",
  {
    variants: {
      variant: {
        default: "filliny-bg-primary/10",
        outline: "filliny-border filliny-border-primary/20 filliny-bg-background",
      },
      size: {
        default: "filliny-h-10 filliny-p-1",
        sm: "filliny-h-8 filliny-p-0.5",
        lg: "filliny-h-12 filliny-p-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const togglePillOptionVariants = cva(
  "filliny-flex filliny-items-center filliny-justify-center filliny-rounded-full filliny-text-sm filliny-font-medium filliny-transition-colors filliny-z-10 filliny-relative",
  {
    variants: {
      variant: {
        default: "filliny-text-muted-foreground data-[state=active]:filliny-text-primary-foreground",
        outline: "filliny-text-muted-foreground data-[state=active]:filliny-text-primary",
      },
      size: {
        default: "filliny-px-4 filliny-py-1.5 filliny-text-sm",
        sm: "filliny-px-3 filliny-py-1 filliny-text-xs",
        lg: "filliny-px-5 filliny-py-2 filliny-text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface TogglePillProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof togglePillVariants> {
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

export const TogglePill = React.forwardRef<HTMLDivElement, TogglePillProps>(
  ({ className, variant, size, value, onValueChange, options, disabled = false, ...props }, ref) => {
    const activeIndex = options.findIndex(option => option.value === value);

    return (
      <div
        ref={ref}
        className={cn(
          togglePillVariants({ variant, size, className }),
          disabled && "filliny-opacity-60 filliny-pointer-events-none",
        )}
        {...props}>
        {/* Background highlight */}
        {activeIndex !== -1 && (
          <motion.div
            className="filliny-absolute filliny-top-0 filliny-bottom-0 filliny-rounded-full filliny-bg-primary"
            initial={false}
            animate={{
              left: `calc(${(100 / options.length) * activeIndex}% + 4px)`,
              width: `calc(${100 / options.length}% - 8px)`,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}

        {/* Options */}
        <div className="filliny-relative filliny-flex filliny-w-full filliny-items-stretch filliny-justify-between">
          {options.map(option => (
            <TooltipProvider key={option.value} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onValueChange(option.value)}
                    disabled={disabled}
                    data-state={value === option.value ? "active" : "inactive"}
                    className={cn(
                      togglePillOptionVariants({ variant, size }),
                      "filliny-flex-1 filliny-inline-flex",
                      value === option.value && "filliny-text-primary-foreground",
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
                </TooltipTrigger>
                {option.tooltip && (
                  <TooltipContent side="top" className="filliny-z-[99999]">
                    <p>{option.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    );
  },
);

TogglePill.displayName = "TogglePill";
