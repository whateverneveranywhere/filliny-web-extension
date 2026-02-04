import { ShadowTooltip, ShadowTooltipContent, ShadowTooltipProvider, ShadowTooltipTrigger } from '../ui/shadow-tooltip';
import { durations, easings, animationClasses } from '@/lib/animations';
import type { ReactNode } from 'react';
import type * as React from 'react';

interface ButtonComponentProps {
  isHovered: boolean;
  isDragging: boolean;
}

interface ButtonWrapperProps {
  isHovered: boolean;
  isDragging: boolean;
  tooltipContent?: string;
  children?: ReactNode;
}

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({ children, isHovered, isDragging, tooltipContent }) => {
  const isVisible = isHovered || isDragging;

  return (
    <div
      style={{
        willChange: 'transform, opacity',
        transition: `transform ${durations.slow}ms ${easings.easeOut}, opacity ${durations.slow}ms ${easings.easeOut}`,
      }}
      className={`filliny-z-[1000000000001] filliny-flex filliny-items-center ${animationClasses.transitionSlow} ${isVisible ? 'filliny-opacity-100 filliny-translate-x-0' : 'filliny-opacity-0 filliny-translate-x-4 filliny-pointer-events-none'}`}>
      <ShadowTooltipProvider delayDuration={0}>
        <ShadowTooltip>
          <ShadowTooltipTrigger asChild>
            <div className="filliny-pointer-events-auto">{children}</div>
          </ShadowTooltipTrigger>
          <ShadowTooltipContent side="top" className="filliny-z-[1000000000002] filliny-select-none">
            <p>{tooltipContent}</p>
          </ShadowTooltipContent>
        </ShadowTooltip>
      </ShadowTooltipProvider>
    </div>
  );
};

export { ButtonWrapper };
export type { ButtonComponentProps, ButtonWrapperProps };
