import { useState, useEffect, useRef, useCallback } from 'react';

interface ButtonPosition {
  top: number;
  left: number;
}

interface UseFieldButtonPositionProps {
  fieldElement: HTMLElement;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface UseFieldButtonPositionReturn {
  buttonPosition: ButtonPosition;
  updateButtonPosition: () => void;
}

/**
 * Custom hook to track and update field button position
 * Separates position tracking logic from component rendering
 */
export const useFieldButtonPosition = ({
  fieldElement,
  containerRef,
}: UseFieldButtonPositionProps): UseFieldButtonPositionReturn => {
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition>({ top: 0, left: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  const updateButtonPosition = useCallback(() => {
    if (!containerRef.current || !fieldElement) return;

    try {
      // Get field position
      const fieldRect = fieldElement.getBoundingClientRect();

      // Position button at the top-right corner of the field
      const newPosition = {
        top: fieldRect.top - 10 + window.scrollY,
        left: fieldRect.right - 10 + window.scrollX,
      };

      setButtonPosition(newPosition);
    } catch (error) {
      console.debug('Error updating button position:', error);
    }
  }, [fieldElement, containerRef]);

  // Set up positioning and observers
  useEffect(() => {
    if (!fieldElement?.isConnected) return;

    // Initial positioning
    updateButtonPosition();

    // Set up ResizeObserver
    resizeObserverRef.current = new ResizeObserver(() => {
      requestAnimationFrame(updateButtonPosition);
    });
    resizeObserverRef.current.observe(fieldElement);

    // Set up MutationObserver
    mutationObserverRef.current = new MutationObserver(() => {
      requestAnimationFrame(updateButtonPosition);
    });
    mutationObserverRef.current.observe(fieldElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Listen for scroll and resize events
    const handleWindowEvents = () => requestAnimationFrame(updateButtonPosition);
    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, { passive: true });

    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents);
    };
  }, [fieldElement, updateButtonPosition]);

  return {
    buttonPosition,
    updateButtonPosition,
  };
};
