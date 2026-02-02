import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';
import { durations, easings, animationClasses } from '@/lib/animations';
import type { ReactNode, CSSProperties } from 'react';
import type * as React from 'react';

export interface ButtonComponentProps {
  isHovered: boolean;
  isDragging: boolean;
}

export interface ButtonWrapperProps {
  isHovered: boolean;
  isDragging: boolean;
  position: CSSProperties;
  tooltipContent?: string;
  children?: ReactNode;
}

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({ children, isHovered, isDragging, position, tooltipContent }) => {
  const isVisible = isHovered || isDragging;

  return (
    <div
      style={{
        position: 'absolute',
        willChange: 'transform, opacity',
        ...position,
        transition: `transform ${durations.slow}ms ${easings.easeOut}, opacity ${durations.slow}ms ${easings.easeOut}`,
      }}
      className="filliny-z-[1000000000001] filliny-p-2">
      <div
        className={`${animationClasses.transitionSlow} ${isVisible ? 'filliny-opacity-100' : 'filliny-opacity-0 filliny-pointer-events-none'}`}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="filliny-pointer-events-auto">{children}</div>
            </TooltipTrigger>
            <TooltipContent side="right" className="filliny-z-[1000000000002] filliny-select-none">
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export { ButtonWrapper };
