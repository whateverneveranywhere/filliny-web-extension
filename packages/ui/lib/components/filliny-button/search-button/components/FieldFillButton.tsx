import { Button } from "../../../ui/button";
import { TogglePill } from "../../../ui/toggle-pill";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/tooltip";
import { cn } from "@/lib/utils";
import { useStorage } from "@extension/shared";
import { fieldButtonsStorage } from "@extension/storage";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Wand2, TestTube2 } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  // Get the current test mode preference
  const preferTestMode = settings?.preferTestMode ?? false;
  const fillMode = preferTestMode ? "test" : "ai";

  // Enhanced positioning system
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

  // Handle field fill with current preference
  const handleFieldFill = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);

    onFill(field, preferTestMode)
      .catch(error => console.error("Error filling field:", error))
      .finally(() => {
        setIsLoading(false);
      });
  }, [isLoading, onFill, field, preferTestMode]);

  // Handle mode change
  const handleModeChange = useCallback((value: string) => {
    const newPreferTestMode = value === "test";
    fieldButtonsStorage.setPreferTestMode(newPreferTestMode);
  }, []);

  // Handle mouse enter with delay to prevent flickering
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true);
    }, 50);
  }, []);

  // Handle mouse leave with delay
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  }, []);

  // Determine if we should show the toggle
  const shouldShowToggle = isHovered && !isLoading;

  // Animation variants for toggle pill - more liquid-like
  const toggleVariants = {
    hidden: {
      opacity: 0,
      x: 20,
      width: 0,
      scale: 0.9,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 35,
        duration: 0.25,
      },
    },
    visible: {
      opacity: 1,
      x: 0,
      width: "auto",
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 26,
        mass: 0.8,
        duration: 0.25,
      },
    },
  };

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
      <div className="filliny-flex filliny-items-center filliny-justify-end filliny-relative">
        {/* Toggle container - positioned to connect with the action button */}
        <div className="filliny-absolute filliny-right-[calc(100%-6px)] filliny-top-1/2 filliny-z-0 filliny-translate-y-[-50%] filliny-pointer-events-none">
          <AnimatePresence>
            {shouldShowToggle && (
              <motion.div
                className="filliny-flex filliny-items-center filliny-justify-end filliny-pointer-events-auto"
                variants={toggleVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{ originX: 1 }}>
                <TogglePill
                  value={fillMode}
                  onValueChange={handleModeChange}
                  size="sm"
                  className="filliny-shadow-md filliny-min-w-[140px] filliny-mr-1"
                  options={[
                    {
                      value: "test",
                      label: "Test",
                      icon: <TestTube2 />,
                      tooltip: "Fill with test data",
                    },
                    {
                      value: "ai",
                      label: "AI",
                      icon: <CheckCircle />,
                      tooltip: "Fill with AI-generated data",
                    },
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action button - higher z-index for proper layering */}
        <div className="filliny-relative filliny-z-10">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0.8, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}>
                  <Button
                    variant="default"
                    onClick={handleFieldFill}
                    disabled={isLoading}
                    loading={isLoading}
                    className="filliny-size-10 filliny-min-h-10 filliny-min-w-10 filliny-overflow-hidden !filliny-rounded-full filliny-shadow-md">
                    {!isLoading && <Wand2 className="filliny-size-4 filliny-text-white" />}
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Fill field with {preferTestMode ? "test" : "AI"} data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
