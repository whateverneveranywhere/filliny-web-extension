import { useState, useEffect, useRef, useCallback } from 'react';
import type { OverlayPosition } from '@extension/shared';

interface UseOverlayPositionProps {
  formRef: React.MutableRefObject<HTMLElement | null>;
  initialPosition: OverlayPosition;
}

interface UseOverlayPositionReturn {
  overlayPosition: OverlayPosition;
  isFormLikelyOutOfView: boolean;
}

/**
 * Calculates the overlay position based on form position and viewport
 */
const calculateOverlayPosition = (
  formElement: HTMLElement,
  lastKnownPosition: OverlayPosition,
): { position: OverlayPosition; isOutOfView: boolean } => {
  const formRect = formElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Calculate the visible portion of the form
  const formTop = Math.max(0, formRect.top);
  const formBottom = Math.min(viewportHeight, formRect.bottom);
  const formLeft = Math.max(0, formRect.left);
  const formRight = Math.min(viewportWidth, formRect.right);

  // Calculate visible dimensions
  const visibleWidth = Math.max(0, formRight - formLeft);
  const visibleHeight = Math.max(0, formBottom - formTop);

  // Check if the form is anywhere near the viewport
  const isFormNearViewport =
    formRect.bottom > -500 &&
    formRect.top < viewportHeight + 500 &&
    formRect.right > -500 &&
    formRect.left < viewportWidth + 500;

  if (isFormNearViewport) {
    const isFormVisible =
      visibleWidth > 0 &&
      visibleHeight > 0 &&
      formRect.bottom > 0 &&
      formRect.top < viewportHeight &&
      formRect.right > 0 &&
      formRect.left < viewportWidth;

    if (isFormVisible) {
      // Ensure minimum dimensions for the overlay
      const minWidth = Math.max(visibleWidth, 200);
      const minHeight = Math.max(visibleHeight, 100);

      // If the form is larger than viewport, ensure overlay covers the visible portion properly
      const overlayTop = formRect.top < 0 ? 0 : formRect.top;
      const overlayLeft = formRect.left < 0 ? 0 : formRect.left;
      const overlayWidth = Math.min(minWidth, viewportWidth - overlayLeft);
      const overlayHeight = Math.min(minHeight, viewportHeight - overlayTop);

      return {
        position: {
          top: overlayTop,
          left: overlayLeft,
          width: overlayWidth,
          height: overlayHeight,
        },
        isOutOfView: false,
      };
    }

    // Form is near but not visible - position at edge
    const topEdge = formRect.top < 0;
    const bottomEdge = formRect.bottom > viewportHeight;
    const leftEdge = formRect.left < 0;
    const rightEdge = formRect.right > viewportWidth;

    let newPos: OverlayPosition;

    if (topEdge) {
      newPos = {
        top: 0,
        left: Math.max(0, Math.min(viewportWidth - 200, formRect.left)),
        width: 200,
        height: 100,
      };
    } else if (bottomEdge) {
      newPos = {
        top: viewportHeight - 100,
        left: Math.max(0, Math.min(viewportWidth - 200, formRect.left)),
        width: 200,
        height: 100,
      };
    } else if (leftEdge) {
      newPos = {
        top: Math.max(0, Math.min(viewportHeight - 100, formRect.top)),
        left: 0,
        width: 200,
        height: 100,
      };
    } else if (rightEdge) {
      newPos = {
        top: Math.max(0, Math.min(viewportHeight - 100, formRect.top)),
        left: viewportWidth - 200,
        width: 200,
        height: 100,
      };
    } else {
      newPos = lastKnownPosition;
    }

    return { position: newPos, isOutOfView: true };
  }

  // Form is far from viewport - fixed position in corner
  return {
    position: {
      top: viewportHeight - 100,
      left: viewportWidth - 200,
      width: 200,
      height: 100,
    },
    isOutOfView: true,
  };
};

/**
 * Custom hook to track and update overlay position based on form position
 * Separates position tracking logic from component rendering
 */
export const useOverlayPosition = ({ formRef, initialPosition }: UseOverlayPositionProps): UseOverlayPositionReturn => {
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(initialPosition);
  const [isFormLikelyOutOfView, setIsFormLikelyOutOfView] = useState(false);
  const lastKnownPosition = useRef<OverlayPosition>(initialPosition);
  const isUpdating = useRef(false);
  const rafId = useRef<number | null>(null);

  const updatePosition = useCallback(() => {
    if (!formRef.current || isUpdating.current) return;
    isUpdating.current = true;

    try {
      const { position, isOutOfView } = calculateOverlayPosition(formRef.current, lastKnownPosition.current);
      setOverlayPosition(position);
      setIsFormLikelyOutOfView(isOutOfView);
      lastKnownPosition.current = position;
    } catch (error) {
      console.error('Error updating overlay position:', error);
    }

    isUpdating.current = false;
  }, [formRef]);

  const handleScroll = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    rafId.current = requestAnimationFrame(updatePosition);
  }, [updatePosition]);

  useEffect(() => {
    if (!formRef.current) return;

    // Set up event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });

    resizeObserver.observe(formRef.current);
    resizeObserver.observe(document.documentElement);

    // Set up mutation observer
    const mutationObserver = new MutationObserver(() => {
      handleScroll();
    });

    mutationObserver.observe(formRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial position update
    updatePosition();

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [formRef, handleScroll, updatePosition]);

  return {
    overlayPosition,
    isFormLikelyOutOfView,
  };
};

export { calculateOverlayPosition };
