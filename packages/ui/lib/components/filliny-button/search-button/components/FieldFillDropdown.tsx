import { useStorage } from "@extension/shared";
import { fieldButtonsStorage } from "@extension/storage";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Field } from "@extension/shared";

interface FieldFillDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  field: Field;
  position: { top: number; left: number };
  onSelect: (useTestMode: boolean) => Promise<void>;
}

// Temporary inline components using Tailwind classes
const InlineCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={`filliny-card filliny-bg-background filliny-border filliny-rounded-md filliny-shadow-lg ${className || ""}`}
      {...props}>
      {children}
    </div>
  ),
);

const InlineCardHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`filliny-card-header filliny-p-3 filliny-pb-2 ${className || ""}`} {...props}>
    {children}
  </div>
);

const InlineCardTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`filliny-card-title filliny-text-sm filliny-font-medium ${className || ""}`} {...props}>
    {children}
  </h3>
);

const InlineCardContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`filliny-card-content filliny-p-3 filliny-pt-0 filliny-space-y-1 ${className || ""}`} {...props}>
    {children}
  </div>
);

const InlineButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "ghost";
    size?: "sm";
  }
>(({ className, variant = "default", size = "sm", children, ...props }, ref) => {
  const baseClasses =
    "filliny-inline-flex filliny-items-center filliny-justify-start filliny-w-full filliny-h-8 filliny-transition-all filliny-duration-200";

  const variantClasses: Record<string, string> = {
    default: "filliny-btn-default",
    ghost: "filliny-btn-ghost",
  };

  const classes = `${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className || ""}`;

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});

// Simple icon components
const TestTubeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <div
    className={`filliny-animate-spin filliny-border-2 filliny-border-transparent filliny-border-t-current filliny-rounded-full ${className}`}
  />
);

export const FieldFillDropdown: React.FC<FieldFillDropdownProps> = ({ isOpen, onClose, field, position, onSelect }) => {
  const settings = useStorage(fieldButtonsStorage);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to ensure dropdown stays within viewport
  const adjustPosition = useCallback(() => {
    if (!dropdownRef.current) return;

    const dropdown = dropdownRef.current;
    const rect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { top, left } = position;

    // Ensure dropdown doesn't go off-screen to the right
    if (left + rect.width > viewportWidth - 10) {
      left = viewportWidth - rect.width - 10;
    }

    // Ensure dropdown doesn't go off-screen to the left
    if (left < 10) {
      left = 10;
    }

    // Ensure dropdown doesn't go off-screen at the bottom
    if (top + rect.height > viewportHeight - 10) {
      top = position.top - rect.height - 10;
    }

    // Ensure dropdown doesn't go off-screen at the top
    if (top < 10) {
      top = 10;
    }

    setAdjustedPosition({ top, left });
  }, [position]);

  // Adjust position when dropdown opens or position changes
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      return;
    }

    // Initial adjustment
    adjustPosition();

    // Adjust on window resize or scroll
    const handleWindowChange = () => {
      requestAnimationFrame(adjustPosition);
    };

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, { passive: true });

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange);
    };
  }, [isOpen, adjustPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen, onClose]);

  // Close dropdown on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle selection with proper error handling
  const handleSelect = useCallback(
    async (useTestMode: boolean, e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLoading) return;

      try {
        setIsLoading(true);
        await fieldButtonsStorage.setPreferTestMode(useTestMode);
        await onSelect(useTestMode);
      } catch (error) {
        console.error("Error filling field:", error);
      } finally {
        setIsLoading(false);
        onClose();
      }
    },
    [isLoading, onSelect, onClose],
  );

  // Handle mouse down to prevent event bubbling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <InlineCard
      ref={dropdownRef}
      className="filliny-fixed filliny-z-[10000000] filliny-w-48 filliny-shadow-lg filliny-border"
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
        pointerEvents: "auto",
      }}
      data-filliny-element="true"
      data-filliny-dropdown="true"
      onMouseDown={handleMouseDown}
      role="menu"
      aria-label="Fill options menu"
      tabIndex={0}>
      <InlineCardHeader>
        <InlineCardTitle>Fill Options</InlineCardTitle>
      </InlineCardHeader>

      <InlineCardContent>
        <InlineButton
          variant={settings?.preferTestMode ? "default" : "ghost"}
          onClick={e => handleSelect(true, e)}
          disabled={isLoading}
          aria-label="Fill with test data">
          {isLoading ? (
            <LoaderIcon className="filliny-mr-2 filliny-h-3 filliny-w-3" />
          ) : (
            <TestTubeIcon className="filliny-mr-2 filliny-h-3 filliny-w-3" />
          )}
          Test Mode
        </InlineButton>

        <InlineButton
          variant={!settings?.preferTestMode ? "default" : "ghost"}
          onClick={e => handleSelect(false, e)}
          disabled={isLoading}
          aria-label="Fill with AI data">
          {isLoading ? (
            <LoaderIcon className="filliny-mr-2 filliny-h-3 filliny-w-3" />
          ) : (
            <SparklesIcon className="filliny-mr-2 filliny-h-3 filliny-w-3" />
          )}
          AI Mode
        </InlineButton>
      </InlineCardContent>
    </InlineCard>
  );
};
