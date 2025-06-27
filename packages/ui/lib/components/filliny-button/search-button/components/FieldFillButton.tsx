import { FieldFillDropdown } from "./FieldFillDropdown";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Field } from "@extension/shared";

interface FieldFillButtonProps {
  fieldElement: HTMLElement;
  field: Field;
  onFill: (field: Field, useTestMode: boolean) => Promise<void>;
}

// Temporary inline Button component using Tailwind classes
const InlineButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: "default" | "ghost";
    size?: "sm" | "icon";
  }
>(({ className, variant = "default", size = "default", loading = false, children, ...props }, ref) => {
  const baseClasses =
    "filliny-inline-flex filliny-items-center filliny-justify-center filliny-transition-all filliny-duration-200";

  const variantClasses = {
    default: "filliny-bg-primary filliny-text-primary-foreground hover:filliny-bg-primary/90",
    ghost: "filliny-bg-transparent hover:filliny-bg-accent hover:filliny-text-accent-foreground",
  };

  const sizeClasses: Record<string, string> = {
    default: "filliny-h-10 filliny-px-4 filliny-py-2 filliny-rounded-md",
    sm: "filliny-h-8 filliny-px-3 filliny-rounded-md filliny-text-sm",
    icon: "filliny-h-7 filliny-w-7 filliny-rounded-full",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size] || sizeClasses.default} ${className || ""}`;

  return (
    <button ref={ref} className={classes} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <div className="filliny-h-3 filliny-w-3 filliny-animate-spin filliny-border-2 filliny-border-transparent filliny-border-t-current filliny-rounded-full" />
      ) : (
        children
      )}
    </button>
  );
});

// Simple Check icon component
const CheckIcon = () => (
  <svg
    className="filliny-h-3 filliny-w-3"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const FieldFillButton: React.FC<FieldFillButtonProps> = ({ fieldElement, field, onFill }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  // Find the optimal parent wrapper for positioning
  const findFieldWrapper = useCallback((element: HTMLElement): HTMLElement => {
    let current = element;
    let bestWrapper = element;

    while (current.parentElement && current.parentElement !== document.body) {
      const parent = current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();

      const widthRatio = parentRect.width / currentRect.width;
      const heightRatio = parentRect.height / currentRect.height;

      const isReasonableSize = widthRatio <= 3 && heightRatio <= 2;
      const hasSemanticMeaning =
        parent.tagName === "FIELDSET" ||
        parent.tagName === "LABEL" ||
        parent.getAttribute("role") === "group" ||
        /field|input|form|control|wrapper|container/.test(parent.className.toLowerCase());

      if (isReasonableSize && hasSemanticMeaning) {
        bestWrapper = parent;
      } else if (widthRatio > 5 || heightRatio > 3) {
        break;
      }

      current = parent;
    }

    return bestWrapper;
  }, []);

  // Enhanced positioning system
  const updateButtonPosition = useCallback(() => {
    if (!buttonRef.current || !fieldElement) return;

    try {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      // Find the optimal parent wrapper for positioning
      const fieldWrapper = findFieldWrapper(fieldElement);
      const wrapperRect = fieldWrapper.getBoundingClientRect();

      // Position button at the top-right corner of the field wrapper
      const newPosition = {
        top: wrapperRect.top + scrollTop - 10,
        left: wrapperRect.right + scrollLeft - 10,
      };

      setButtonPosition(newPosition);
    } catch (error) {
      console.debug("Error updating button position:", error);
      // Fallback to field element positioning
      try {
        const fieldRect = fieldElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        setButtonPosition({
          top: fieldRect.top + scrollTop - 10,
          left: fieldRect.right + scrollLeft - 10,
        });
      } catch (fallbackError) {
        console.debug("Fallback positioning also failed:", fallbackError);
      }
    }
  }, [fieldElement, findFieldWrapper]);

  // Set up positioning and observers
  useEffect(() => {
    // Defensive check to ensure fieldElement still exists
    if (!fieldElement || !fieldElement.isConnected) {
      console.debug("FieldFillButton: fieldElement is no longer connected to DOM");
      return;
    }

    try {
      // Initial positioning
      updateButtonPosition();

      // Set up ResizeObserver with error handling
      try {
        resizeObserverRef.current = new ResizeObserver(() => {
          try {
            updateButtonPosition();
          } catch (error) {
            console.debug("Error in ResizeObserver callback:", error);
          }
        });
        resizeObserverRef.current.observe(fieldElement);
      } catch (resizeObserverError) {
        console.debug("Error setting up ResizeObserver:", resizeObserverError);
      }

      // Set up MutationObserver with error handling
      try {
        mutationObserverRef.current = new MutationObserver(() => {
          try {
            requestAnimationFrame(updateButtonPosition);
          } catch (error) {
            console.debug("Error in MutationObserver callback:", error);
          }
        });

        mutationObserverRef.current.observe(fieldElement, {
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      } catch (mutationObserverError) {
        console.debug("Error setting up MutationObserver:", mutationObserverError);
      }

      // Listen for scroll and resize events with error handling
      const handleWindowEvents = () => {
        try {
          requestAnimationFrame(updateButtonPosition);
        } catch (error) {
          console.debug("Error in window events handler:", error);
        }
      };

      try {
        window.addEventListener("resize", handleWindowEvents);
        window.addEventListener("scroll", handleWindowEvents, { passive: true });
      } catch (eventListenerError) {
        console.debug("Error setting up window event listeners:", eventListenerError);
      }

      return () => {
        // Cleanup observers with error handling
        try {
          resizeObserverRef.current?.disconnect();
        } catch (error) {
          console.debug("Error disconnecting ResizeObserver:", error);
        }

        try {
          mutationObserverRef.current?.disconnect();
        } catch (error) {
          console.debug("Error disconnecting MutationObserver:", error);
        }

        // Cleanup event listeners with error handling
        try {
          window.removeEventListener("resize", handleWindowEvents);
          window.removeEventListener("scroll", handleWindowEvents);
        } catch (error) {
          console.debug("Error removing window event listeners:", error);
        }

        // Cleanup timeout with error handling
        try {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
        } catch (error) {
          console.debug("Error clearing hover timeout:", error);
        }
      };
    } catch (error) {
      console.error("Error in FieldFillButton useEffect setup:", error);
      return () => {
        // Minimal cleanup on error
        try {
          resizeObserverRef.current?.disconnect();
          mutationObserverRef.current?.disconnect();
        } catch (cleanupError) {
          console.debug("Error in cleanup:", cleanupError);
        }
      };
    }
  }, [fieldElement, updateButtonPosition]);

  // Handle button click
  const handleButtonClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDropdownOpen) {
        setIsDropdownOpen(false);
        return;
      }

      // Quick fill with default mode (AI mode)
      await handleFieldFill(false);
    },
    [isDropdownOpen],
  );

  // Handle context menu for dropdown
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      } else {
        showDropdown();
      }
    },
    [isDropdownOpen],
  );

  // Show dropdown
  const showDropdown = useCallback(() => {
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      setDropdownPosition({
        top: buttonRect.bottom + 5,
        left: Math.max(5, buttonRect.left - 100),
      });
      setIsDropdownOpen(true);
    }
  }, []);

  // Handle mouse enter with proper cleanup
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      if (!isDropdownOpen) {
        showDropdown();
      }
    }, 300);
  }, [isDropdownOpen, showDropdown]);

  // Handle mouse leave with proper cleanup
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);

    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay closing dropdown to allow moving to it
    setTimeout(() => {
      if (!document.querySelector(':hover[data-filliny-dropdown="true"]')) {
        setIsDropdownOpen(false);
      }
    }, 200);
  }, []);

  // Handle field fill with mode selection
  const handleFieldFill = useCallback(
    async (useTestMode: boolean) => {
      if (isLoading) return;

      setIsLoading(true);

      try {
        await onFill(field, useTestMode);
      } catch (error) {
        console.error("Error filling field:", error);
      } finally {
        setIsLoading(false);
        setIsDropdownOpen(false);
      }
    },
    [isLoading, onFill, field],
  );

  return (
    <>
      <InlineButton
        ref={buttonRef}
        size="icon"
        variant="default"
        className={`filliny-fixed filliny-shadow-lg filliny-transition-all filliny-duration-200 hover:filliny-scale-110 filliny-opacity-95 hover:filliny-opacity-100 ${isHovered ? "filliny-scale-110 filliny-opacity-100" : ""} ${isLoading ? "filliny-opacity-70" : ""} `}
        style={{
          top: `${buttonPosition.top}px`,
          left: `${buttonPosition.left}px`,
          zIndex: 99999,
        }}
        onClick={handleButtonClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        loading={isLoading}
        disabled={isLoading}
        title="Fill this field (hover for options)"
        data-filliny-element="true"
        type="button"
        aria-label={`Fill ${field.label || field.type} field`}>
        {!isLoading && <CheckIcon />}
      </InlineButton>

      <FieldFillDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        field={field}
        position={dropdownPosition}
        onSelect={handleFieldFill}
      />
    </>
  );
};
