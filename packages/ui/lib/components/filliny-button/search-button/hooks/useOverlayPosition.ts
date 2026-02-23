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

const OVERLAY_PADDING = 24; // padding around the fields bounding box

const FIELD_SELECTORS =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea, [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [contenteditable="true"], [contenteditable=""]';

/**
 * Calculate a tight bounding box around the actual form fields within the container,
 * rather than using the entire container's rect (which may span the whole page).
 */
const getFieldsBoundingRect = (formElement: HTMLElement): DOMRect | null => {
  const fields = formElement.querySelectorAll<HTMLElement>(FIELD_SELECTORS);
  if (fields.length === 0) return null;

  let minTop = Infinity;
  let minLeft = Infinity;
  let maxBottom = -Infinity;
  let maxRight = -Infinity;
  let validFieldCount = 0;

  for (const field of Array.from(fields)) {
    const rect = field.getBoundingClientRect();
    // Skip hidden or zero-size fields
    if (rect.width === 0 && rect.height === 0) continue;
    const style = window.getComputedStyle(field);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    validFieldCount++;
    minTop = Math.min(minTop, rect.top);
    minLeft = Math.min(minLeft, rect.left);
    maxBottom = Math.max(maxBottom, rect.bottom);
    maxRight = Math.max(maxRight, rect.right);
  }

  if (validFieldCount === 0) return null;

  // Also include labels that are associated with the fields
  const labels = formElement.querySelectorAll<HTMLElement>('label');
  for (const label of Array.from(labels)) {
    const rect = label.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    minTop = Math.min(minTop, rect.top);
    minLeft = Math.min(minLeft, rect.left);
    maxBottom = Math.max(maxBottom, rect.bottom);
    maxRight = Math.max(maxRight, rect.right);
  }

  // Also include submit/action buttons within the form
  const buttons = formElement.querySelectorAll<HTMLElement>(
    'button[type="submit"], input[type="submit"], button:not([type]), [role="button"]',
  );
  for (const button of Array.from(buttons)) {
    const rect = button.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    // Only include buttons that are reasonably close to the form fields
    if (rect.top > maxBottom + 100) continue;
    maxBottom = Math.max(maxBottom, rect.bottom);
    maxRight = Math.max(maxRight, rect.right);
    minLeft = Math.min(minLeft, rect.left);
  }

  return new DOMRect(minLeft, minTop, maxRight - minLeft, maxBottom - minTop);
};

/**
 * Calculates the overlay position based on form position and viewport.
 * Uses a tight bounding box around actual form fields when the form container
 * is large (e.g., <main>, <body>), preventing the overlay from covering the entire page.
 */
const calculateOverlayPosition = (
  formElement: HTMLElement,
  lastKnownPosition: OverlayPosition,
): { position: OverlayPosition; isOutOfView: boolean } => {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Try to get a tight bounding box around just the form fields
  const formRect = formElement.getBoundingClientRect();
  const fieldsBoundingRect = getFieldsBoundingRect(formElement);

  // Always prefer the tighter fields bounding rect when available.
  // This ensures the overlay covers just the form fields area, not the entire container.
  // Falls back to the full form container rect only when no individual fields are found.
  const effectiveRect = fieldsBoundingRect ?? formRect;

  // Apply padding around the effective rect
  const paddedTop = effectiveRect.top - OVERLAY_PADDING;
  const paddedLeft = effectiveRect.left - OVERLAY_PADDING;
  const paddedWidth = effectiveRect.width + OVERLAY_PADDING * 2;
  const paddedHeight = effectiveRect.height + OVERLAY_PADDING * 2;

  // Calculate the visible portion clipped to viewport
  const formTop = Math.max(0, paddedTop);
  const formBottom = Math.min(viewportHeight, paddedTop + paddedHeight);
  const formLeft = Math.max(0, paddedLeft);
  const formRight = Math.min(viewportWidth, paddedLeft + paddedWidth);

  const visibleWidth = Math.max(0, formRight - formLeft);
  const visibleHeight = Math.max(0, formBottom - formTop);

  // Check if the form is anywhere near the viewport
  const isFormNearViewport =
    paddedTop + paddedHeight > -500 &&
    paddedTop < viewportHeight + 500 &&
    paddedLeft + paddedWidth > -500 &&
    paddedLeft < viewportWidth + 500;

  if (isFormNearViewport) {
    const isFormVisible =
      visibleWidth > 0 &&
      visibleHeight > 0 &&
      paddedTop + paddedHeight > 0 &&
      paddedTop < viewportHeight &&
      paddedLeft + paddedWidth > 0 &&
      paddedLeft < viewportWidth;

    if (isFormVisible) {
      const minWidth = Math.max(visibleWidth, 200);
      const minHeight = Math.max(visibleHeight, 100);

      const overlayTop = paddedTop < 0 ? 0 : paddedTop;
      const overlayLeft = paddedLeft < 0 ? 0 : paddedLeft;
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
    const topEdge = paddedTop < 0;
    const bottomEdge = paddedTop + paddedHeight > viewportHeight;
    const leftEdge = paddedLeft < 0;
    const rightEdge = paddedLeft + paddedWidth > viewportWidth;

    let newPos: OverlayPosition;

    if (topEdge) {
      newPos = {
        top: 0,
        left: Math.max(0, Math.min(viewportWidth - 200, paddedLeft)),
        width: 200,
        height: 100,
      };
    } else if (bottomEdge) {
      newPos = {
        top: viewportHeight - 100,
        left: Math.max(0, Math.min(viewportWidth - 200, paddedLeft)),
        width: 200,
        height: 100,
      };
    } else if (leftEdge) {
      newPos = {
        top: Math.max(0, Math.min(viewportHeight - 100, paddedTop)),
        left: 0,
        width: 200,
        height: 100,
      };
    } else if (rightEdge) {
      newPos = {
        top: Math.max(0, Math.min(viewportHeight - 100, paddedTop)),
        left: viewportWidth - 200,
        width: 200,
        height: 100,
      };
    } else {
      newPos = lastKnownPosition;
    }

    return { position: newPos, isOutOfView: true };
  }

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
