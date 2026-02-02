import { useState, useCallback, useRef } from 'react';

interface UseHoverStateProps {
  enterDelay?: number;
  leaveDelay?: number;
}

interface UseHoverStateReturn {
  isHovered: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

/**
 * Custom hook to manage hover state with configurable delays
 * Prevents flickering by using timeouts
 */
export const useHoverState = ({ enterDelay = 50, leaveDelay = 150 }: UseHoverStateProps = {}): UseHoverStateReturn => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true);
    }, enterDelay);
  }, [enterDelay]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      setIsHovered(false);
    }, leaveDelay);
  }, [leaveDelay]);

  return {
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
  };
};
