import { Button } from "../../../ui/button";
import {
  ShadowDropdownMenu,
  ShadowDropdownMenuContent,
  ShadowDropdownMenuRadioGroup,
  ShadowDropdownMenuRadioItem,
  ShadowDropdownMenuSeparator,
  ShadowDropdownMenuTrigger,
} from "../../../ui/shadow-ui";
import { useStorage } from "@extension/shared";
import { fieldButtonsStorage } from "@extension/storage";
import { CheckCircle, ChevronDown, Wand2, TestTube2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Field } from "@extension/shared";
import type * as React from "react";

interface FieldFillButtonProps {
  fieldElement: HTMLElement;
  field: Field;
  onFill: (field: Field, useTestMode: boolean) => Promise<void>;
}

export const FieldFillButton: React.FC<FieldFillButtonProps> = ({ fieldElement, field, onFill }) => {
  const settings = useStorage(fieldButtonsStorage);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  // Get the current test mode preference
  const preferTestMode = settings?.preferTestMode ?? false;

  // Enhanced positioning system - absolute positioning relative to the viewport
  const updateButtonPosition = useCallback(() => {
    if (!buttonRef.current || !fieldElement) return;

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
      console.debug("Error updating button position:", error);
    }
  }, [fieldElement]);

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
      attributeFilter: ["style", "class"],
    });

    // Listen for scroll and resize events
    const handleWindowEvents = () => requestAnimationFrame(updateButtonPosition);
    window.addEventListener("resize", handleWindowEvents);
    window.addEventListener("scroll", handleWindowEvents, { passive: true });

    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
      window.removeEventListener("resize", handleWindowEvents);
      window.removeEventListener("scroll", handleWindowEvents);
    };
  }, [fieldElement, updateButtonPosition]);

  // Toggle test mode preference
  const toggleTestMode = useCallback((value: string) => {
    // Convert string value to boolean
    const newPreferTestMode = value === "test";
    fieldButtonsStorage.setPreferTestMode(newPreferTestMode);
    // Auto-close dropdown after selection
    setIsOpen(false);
  }, []);

  // Handle field fill based on current preference
  const handleFieldFill = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);

    onFill(field, preferTestMode)
      .catch(error => console.error("Error filling field:", error))
      .finally(() => {
        setIsLoading(false);
      });
  }, [isLoading, onFill, field, preferTestMode]);

  // Handle direct mode selection and fill
  const handleDirectFill = useCallback(
    (useTestMode: boolean) => {
      if (isLoading) return;

      // Update preference if different
      if (preferTestMode !== useTestMode) {
        fieldButtonsStorage.setPreferTestMode(useTestMode);
      }

      setIsLoading(true);

      onFill(field, useTestMode)
        .catch(error => console.error("Error filling field:", error))
        .finally(() => {
          setIsLoading(false);
          setIsOpen(false);
        });
    },
    [isLoading, onFill, field, preferTestMode],
  );

  // Handle hover events
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setIsOpen(true), 300);
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setIsOpen(false), 300);
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    },
    [hoverTimeout],
  );

  return (
    <div
      ref={containerRef}
      className="filliny-absolute filliny-z-[99999]"
      style={{
        top: `${buttonPosition.top}px`,
        left: `${buttonPosition.left}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {/* Main button group */}
      <div className="filliny-flex filliny-items-center filliny-rounded-full filliny-shadow-md filliny-overflow-hidden">
        {/* Main action button - fills with current preference */}
        <Button
          ref={buttonRef}
          size="sm"
          className={`!filliny-rounded-l-full !filliny-rounded-r-none !filliny-pl-3 !filliny-pr-2 !filliny-py-1 !filliny-bg-primary !filliny-text-primary-foreground hover:!filliny-bg-primary/90 filliny-flex filliny-items-center filliny-gap-1.5`}
          variant="default"
          onClick={handleFieldFill}
          disabled={isLoading}
          type="button"
          loading={isLoading}>
          <Wand2 className="filliny-h-3.5 filliny-w-3.5" />
        </Button>

        {/* Dropdown toggle */}
        <Button
          size="sm"
          className={`!filliny-rounded-l-none !filliny-rounded-r-full !filliny-px-1 !filliny-py-1 !filliny-bg-primary !filliny-text-primary-foreground hover:!filliny-bg-primary/90 filliny-border-l filliny-border-white/20`}
          variant="default"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          type="button">
          <ChevronDown className="filliny-h-3 filliny-w-3" />
        </Button>
      </div>

      {/* Dropdown menu */}
      <ShadowDropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <ShadowDropdownMenuTrigger className="filliny-hidden" />
        <ShadowDropdownMenuContent
          align="center"
          className="!filliny-bg-primary !filliny-text-white filliny-shadow-lg filliny-rounded-lg filliny-border-none filliny-p-1 filliny-w-48"
          sideOffset={5}
          portalContainerId={`field-dropdown-${field.id}`}>
          <div className="filliny-grid filliny-grid-cols-2 filliny-gap-1 filliny-p-1">
            {/* Test mode - direct fill */}
            <Button
              size="sm"
              className={`filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-1 filliny-p-2 ${
                preferTestMode
                  ? "!filliny-bg-white !filliny-text-primary"
                  : "!filliny-bg-primary !filliny-text-white !filliny-border !filliny-border-white/20"
              } hover:!filliny-opacity-90`}
              onClick={() => handleDirectFill(true)}
              disabled={isLoading}>
              <TestTube2 className="filliny-h-4 filliny-w-4" />
              <span className="filliny-text-xs filliny-font-medium">Test</span>
            </Button>

            {/* AI mode - direct fill */}
            <Button
              size="sm"
              className={`filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-1 filliny-p-2 ${
                !preferTestMode
                  ? "!filliny-bg-white !filliny-text-primary"
                  : "!filliny-bg-primary !filliny-text-white !filliny-border !filliny-border-white/20"
              } hover:!filliny-opacity-90`}
              onClick={() => handleDirectFill(false)}
              disabled={isLoading}>
              <CheckCircle className="filliny-h-4 filliny-w-4" />
              <span className="filliny-text-xs filliny-font-medium">AI</span>
            </Button>
          </div>

          <ShadowDropdownMenuSeparator className="!filliny-bg-white/20 filliny-my-1" />

          {/* Set default preference */}
          <ShadowDropdownMenuRadioGroup
            value={preferTestMode ? "test" : "ai"}
            onValueChange={toggleTestMode}
            className="filliny-p-1">
            <div className="filliny-text-xs filliny-opacity-80 filliny-px-2 filliny-py-1">Set default mode:</div>
            <div className="filliny-flex filliny-gap-1">
              <ShadowDropdownMenuRadioItem
                value="test"
                className={`filliny-flex-1 filliny-cursor-pointer filliny-rounded-md filliny-py-1 filliny-px-2 filliny-text-xs filliny-text-center hover:!filliny-bg-white/10 ${preferTestMode ? "!filliny-bg-white/20" : ""} `}>
                Test Default
              </ShadowDropdownMenuRadioItem>

              <ShadowDropdownMenuRadioItem
                value="ai"
                className={`filliny-flex-1 filliny-cursor-pointer filliny-rounded-md filliny-py-1 filliny-px-2 filliny-text-xs filliny-text-center hover:!filliny-bg-white/10 ${!preferTestMode ? "!filliny-bg-white/20" : ""} `}>
                AI Default
              </ShadowDropdownMenuRadioItem>
            </div>
          </ShadowDropdownMenuRadioGroup>
        </ShadowDropdownMenuContent>
      </ShadowDropdownMenu>
    </div>
  );
};
