import type { ReactNode, CSSProperties } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui";

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

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({ children, isHovered, isDragging, position, tooltipContent }) => (
  <AnimatePresence>
    <motion.div
      style={{ position: "absolute", ...position }}
      className="filliny-z-[1000000000001] filliny-p-2"
      initial={{ x: 0, y: 0 }}
      animate={{
        x: isHovered || isDragging ? position.left : 0,
        y: isHovered || isDragging ? position.top : 0,
        transition: { duration: 0.3 },
      }}
      exit={{
        x: 0,
        y: 0,
        transition: { duration: 0.3, delay: 0.1 },
      }}>
      <div
        className={`filliny-transition-opacity ${isHovered || isDragging ? "filliny-opacity-100" : "filliny-opacity-0"}`}>
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
    </motion.div>
  </AnimatePresence>
);

export { ButtonWrapper };
