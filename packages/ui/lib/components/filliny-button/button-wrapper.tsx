import type { ReactNode, CSSProperties } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ButtonComponentProps {
  isHovered: boolean;
  isDragging: boolean;
}

export interface ButtonWrapperProps {
  isHovered: boolean;
  isDragging: boolean;
  position: CSSProperties;
  children?: ReactNode;
}

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({ children, isHovered, isDragging, position }) => (
  <AnimatePresence>
    <motion.div
      style={{ position: 'absolute', ...position }}
      className="filliny-p-2"
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{
        opacity: isHovered || isDragging ? 1 : 0,
        x: isHovered || isDragging ? position.left : 0,
        y: isHovered || isDragging ? position.top : 0,
        transition: { duration: 0.3 }, // Fast appearance
      }}
      exit={{
        opacity: 0,
        x: 0,
        y: 0,
        transition: { duration: 0.3, delay: 0.1 }, // Slow disappearance with delay
      }}>
      {children}
    </motion.div>
  </AnimatePresence>
);

export { ButtonWrapper };
