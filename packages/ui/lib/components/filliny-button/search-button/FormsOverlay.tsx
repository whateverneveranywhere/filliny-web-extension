import { handleFormClick } from "./handleFormClick";
import { disableOtherButtons, showLoadingIndicator } from "./overlayUtils";
import { Button } from "../../ui";
import { X, Wand2, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { OverlayPosition } from "./types";
import type React from "react";

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
  testMode?: boolean;
}

const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss, testMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(initialPosition);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const lastKnownPosition = useRef<OverlayPosition>(initialPosition);

  useEffect(() => {
    // Enhanced form container finding - must match the logic in handleFormClick
    const findFormElement = (): HTMLElement | null => {
      // Try multiple strategies to find the form element, matching handleFormClick logic
      const strategies = [
        () => document.querySelector(`form[data-form-id="${formId}"]`) as HTMLElement,
        () => document.querySelector(`[data-filliny-form-container][data-form-id="${formId}"]`) as HTMLElement,
        () => document.querySelector(`[data-form-id="${formId}"]`) as HTMLElement,
        // Add new strategies for unified form
        () => document.querySelector(`[data-filliny-unified-form="true"]`) as HTMLElement,
        () => document.querySelector(`[data-filliny-primary-form="true"]`) as HTMLElement,
      ];

      for (const strategy of strategies) {
        const element = strategy();
        if (element) {
          console.log(`🎯 FormsOverlay: Found form element using strategy`);
          // Find the outermost container for better overlay coverage
          return findOutermostContainer(element);
        }
      }

      // Special handling for unified form scenario
      if (formId === "unified-form") {
        // Try to find any element that's part of the unified form group
        const unifiedFormMember = document.querySelector('[data-filliny-unified-form-member="unified-form"]');
        if (unifiedFormMember && unifiedFormMember instanceof HTMLElement) {
          console.log(`🎯 FormsOverlay: Found unified form member`);
          return findOutermostContainer(unifiedFormMember);
        }

        // Last resort: try to find any form with overlay active
        const activeOverlayForm = document.querySelector('[data-filliny-overlay-active="true"]');
        if (activeOverlayForm && activeOverlayForm instanceof HTMLElement) {
          console.log(`🎯 FormsOverlay: Found form with active overlay`);
          return findOutermostContainer(activeOverlayForm);
        }
      }

      // Fallback: look for any form-like container and pick the largest
      const fallbackElements = document.querySelectorAll<HTMLElement>(
        'form, [data-filliny-form-container], [role="form"], [data-form], .form, .form-container',
      );

      if (fallbackElements.length > 0) {
        console.log(`⚠️ FormsOverlay: Using fallback form detection`);
        // Return the largest element (most likely to be the main form)
        const largestElement = Array.from(fallbackElements).reduce((largest, current) => {
          const largestRect = largest.getBoundingClientRect();
          const currentRect = current.getBoundingClientRect();
          return currentRect.width * currentRect.height > largestRect.width * largestRect.height ? current : largest;
        });

        // Find outermost container for the largest element
        return findOutermostContainer(largestElement);
      }

      return null;
    };

    const findOutermostContainer = (element: HTMLElement): HTMLElement => {
      let bestContainer = element;
      let maxFieldCount = countFormFields(element);

      let parent = element.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const parentFieldCount = countFormFields(parent);

        // If parent has more fields, use it
        if (parentFieldCount > maxFieldCount * 1.1) {
          bestContainer = parent;
          maxFieldCount = parentFieldCount;
        }

        parent = parent.parentElement;
      }

      console.log(
        `🎯 FormsOverlay: Using container with ${maxFieldCount} fields: ${bestContainer.tagName}${bestContainer.className ? "." + bestContainer.className : ""}`,
      );
      return bestContainer;
    };

    const countFormFields = (element: HTMLElement): number => {
      const selectors = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
        "select",
        "textarea",
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="checkbox"]',
        '[role="radio"]',
      ];

      let count = 0;
      selectors.forEach(selector => {
        try {
          count += element.querySelectorAll(selector).length;
        } catch {
          // Continue if selector fails
        }
      });

      return count;
    };

    const form = findFormElement();
    if (!form) {
      console.error(`❌ FormsOverlay: Could not find form element for ID: ${formId}`);
      return;
    }

    // Store the form reference for later use
    formRef.current = form;

    console.log(`✅ FormsOverlay: Monitoring form: ${form.tagName}${form.className ? "." + form.className : ""}`);

    let rafId: number;
    let isUpdating = false;

    const updateOverlayPosition = () => {
      if (!formRef.current || isUpdating) return;
      isUpdating = true;

      try {
        const formRect = formRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate the visible portion of the form with better handling
        const formTop = Math.max(0, formRect.top);
        const formBottom = Math.min(viewportHeight, formRect.bottom);
        const formLeft = Math.max(0, formRect.left);
        const formRight = Math.min(viewportWidth, formRect.right);

        // Calculate visible dimensions
        const visibleWidth = Math.max(0, formRight - formLeft);
        const visibleHeight = Math.max(0, formBottom - formTop);

        // Check if the form is anywhere near the viewport
        // (allowing for forms that are slightly above or below visible area)
        const isFormNearViewport =
          formRect.bottom > -500 && // Form is not too far above viewport
          formRect.top < viewportHeight + 500 && // Form is not too far below viewport
          formRect.right > -500 && // Form is not too far left of viewport
          formRect.left < viewportWidth + 500; // Form is not too far right of viewport

        // Calculate absolute position (including scroll)
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (isFormNearViewport) {
          // Form is near the viewport - update position normally
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

            const newPosition = {
              top: overlayTop,
              left: overlayLeft,
              width: overlayWidth,
              height: overlayHeight,
            };

            setOverlayPosition(newPosition);
            lastKnownPosition.current = newPosition;

            console.debug(
              `🔄 FormsOverlay: Updated position - top: ${overlayTop}, left: ${overlayLeft}, width: ${overlayWidth}, height: ${overlayHeight}`,
            );
          } else {
            // Form is near but not visible - position overlay at the edge of the viewport closest to the form
            const topEdge = formRect.top < 0;
            const bottomEdge = formRect.bottom > viewportHeight;
            const leftEdge = formRect.left < 0;
            const rightEdge = formRect.right > viewportWidth;

            // Calculate the best position based on which edge the form is closest to
            let newPos: OverlayPosition;

            if (topEdge) {
              // Form is above viewport - place overlay at top
              newPos = {
                top: 0,
                left: Math.max(0, Math.min(viewportWidth - 200, formRect.left)),
                width: 200,
                height: 100,
              };
            } else if (bottomEdge) {
              // Form is below viewport - place overlay at bottom
              newPos = {
                top: viewportHeight - 100,
                left: Math.max(0, Math.min(viewportWidth - 200, formRect.left)),
                width: 200,
                height: 100,
              };
            } else if (leftEdge) {
              // Form is to the left - place overlay at left edge
              newPos = {
                top: Math.max(0, Math.min(viewportHeight - 100, formRect.top)),
                left: 0,
                width: 200,
                height: 100,
              };
            } else if (rightEdge) {
              // Form is to the right - place overlay at right edge
              newPos = {
                top: Math.max(0, Math.min(viewportHeight - 100, formRect.top)),
                left: viewportWidth - 200,
                width: 200,
                height: 100,
              };
            } else {
              // Use last known good position
              newPos = lastKnownPosition.current;
            }

            setOverlayPosition(newPos);
            lastKnownPosition.current = newPos;
            console.debug(`👁️ FormsOverlay: Form near but not visible, positioned overlay at edge`);
          }
        } else {
          // Form is far from viewport - create a fixed position overlay in the bottom right corner
          const fixedPosition = {
            top: viewportHeight - 100,
            left: viewportWidth - 200,
            width: 200,
            height: 100,
          };

          setOverlayPosition(fixedPosition);
          lastKnownPosition.current = fixedPosition;
          console.debug(`🌎 FormsOverlay: Form far from viewport, using fixed position`);
        }
      } catch (error) {
        console.error("Error updating overlay position:", error);
      }

      isUpdating = false;
    };

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(updateOverlayPosition);
    };

    // Set up event listeners with better throttling
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    // Set up resize observer to handle form dimension changes
    const resizeObserver = new ResizeObserver(() => {
      handleScroll(); // Reuse the throttled scroll handler
    });

    resizeObserver.observe(form);
    resizeObserver.observe(document.documentElement);

    // Set up mutation observer to handle form content changes
    const mutationObserver = new MutationObserver(() => {
      handleScroll(); // Reuse the throttled scroll handler
    });

    mutationObserver.observe(form, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial position update
    updateOverlayPosition();

    // Cleanup function
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [formId]);

  const handleFillClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;

    // Check if a field-specific test is already in progress - if so, don't trigger form overlay
    const fieldTestInProgress = document.querySelector('[data-filliny-loading="true"]');
    if (fieldTestInProgress) {
      console.log("Field test already in progress, not triggering form fill");
      onDismiss();
      return;
    }

    setLoading(true);
    disableOtherButtons(formId);
    showLoadingIndicator(formId);

    try {
      await handleFormClick(event, formId, testMode);
    } finally {
      setLoading(false);
      onDismiss();
    }
  };

  // Handle clicks to scroll back to the form when it's not in viewport
  const handleScrollToForm = () => {
    if (!formRef.current) return;

    const formRect = formRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isFormVisible = formRect.bottom > 0 && formRect.top < viewportHeight && formRect.height > 0;

    if (!isFormVisible) {
      // Calculate scroll position to bring form into view
      const scrollPosition = window.scrollY + formRect.top - 100;
      window.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }
  };

  // Enhanced styling to ensure proper overlay coverage
  const overlayStyle = {
    position: "fixed" as const,
    top: `${overlayPosition.top}px`,
    left: `${overlayPosition.left}px`,
    width: `${overlayPosition.width}px`,
    height: `${overlayPosition.height}px`,
    // Ensure the overlay doesn't interfere with form interaction when not active
    pointerEvents: loading ? ("auto" as const) : ("none" as const),
    // Prevent the overlay from affecting document flow
    contain: "layout style paint" as const,
    // Z-index to ensure it's above form elements but below modals
    zIndex: 10000000,
    // Smooth transitions
    transition: "all 0.3s ease",
  };

  // Determine if form is in view to show additional UI elements
  const isFormLikelyOutOfView =
    (overlayPosition.top === 0 || overlayPosition.top >= window.innerHeight - 150) &&
    (overlayPosition.width === 200 || overlayPosition.height === 100);

  return (
    <div
      ref={overlayRef}
      className={`filliny-pointer-events-auto filliny-fixed filliny-flex filliny-items-center filliny-justify-center filliny-transition-all filliny-duration-300 ${
        loading
          ? "filliny-bg-black/40 filliny-backdrop-blur-sm"
          : "filliny-rounded-lg filliny-bg-black/30 filliny-backdrop-blur-md hover:filliny-bg-black/40"
      } `}
      style={overlayStyle}
      data-highlight-overlay="true"
      data-form-id={formId}
      onClick={isFormLikelyOutOfView ? handleScrollToForm : undefined}
      onKeyDown={isFormLikelyOutOfView ? e => e.key === "Enter" && handleScrollToForm() : undefined}
      role={isFormLikelyOutOfView ? "button" : undefined}
      tabIndex={isFormLikelyOutOfView ? 0 : undefined}
      aria-label={isFormLikelyOutOfView ? "Click to scroll to form" : undefined}>
      {loading ? (
        <div
          className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-4 filliny-text-white"
          style={{ pointerEvents: "auto" }}>
          <div className="filliny-h-8 filliny-w-8 filliny-animate-spin">
            <Loader2 className="filliny-h-full filliny-w-full" />
          </div>
          <div className="filliny-text-center">
            <p className="filliny-text-lg filliny-font-semibold">Filling Your Form</p>
            <p className="filliny-text-sm filliny-text-white/80">AI is intelligently completing your form fields...</p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="filliny-fixed filliny-left-1/2 filliny-top-1/2 filliny-z-[10000001] filliny-flex filliny-w-full filliny-max-w-fit filliny--translate-x-1/2 filliny--translate-y-1/2 filliny-flex-col filliny-items-center filliny-gap-3"
            style={{ pointerEvents: "auto" }}>
            <Button
              ref={buttonRef}
              loading={loading}
              disabled={loading}
              type="button"
              size="lg"
              variant="default"
              onClick={handleFillClick}>
              <Wand2 className="filliny-h-5 filliny-w-5" />
              {testMode ? "Test Fill Form" : "Auto-Fill Form"}
            </Button>
            <p className="filliny-text-sm filliny-text-white/80">
              {isFormLikelyOutOfView
                ? "Click to scroll to form and auto-fill"
                : `Click to automatically fill out this form with ${testMode ? "test data" : "AI"}`}
            </p>
          </div>

          <Button
            size="icon"
            type="button"
            variant="ghost"
            className="filliny-fixed filliny-right-4 filliny-top-4 filliny-h-8 filliny-w-8 filliny-rounded-full filliny-bg-white/10 filliny-text-white hover:filliny-bg-white/20"
            style={{ pointerEvents: "auto" }}
            onClick={onDismiss}
            aria-label="Close overlay">
            <X className="filliny-h-4 filliny-w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export { FormsOverlay };
