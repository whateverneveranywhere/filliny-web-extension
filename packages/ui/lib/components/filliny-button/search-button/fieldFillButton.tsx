import type React from "react";
import { useState, useEffect, useRef } from "react";
import type { Field, FieldType } from "@extension/shared";
import { FieldFillDropdown } from "./fieldFillDropdown";

// Define the spinner animation
const spinKeyframes = `
@keyframes filliny-spin {
  to {
    transform: rotate(360deg);
  }
}
`;

// Add the keyframes to the document (once)
const addSpinnerStyle = (() => {
  let stylesAdded = false;

  return () => {
    if (stylesAdded) return;

    // Check if the style already exists
    if (!document.getElementById("filliny-spinner-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "filliny-spinner-style";
      styleEl.setAttribute("data-filliny-element", "true"); // Mark as our element
      styleEl.textContent = spinKeyframes;
      document.head.appendChild(styleEl);
      stylesAdded = true;
    }
  };
})();

interface FieldFillButtonProps {
  fieldElement: HTMLElement;
  field: Field;
  onFill: (field: Field) => Promise<void>;
}

export const FieldFillButton: React.FC<FieldFillButtonProps> = ({ fieldElement, field, onFill: _onFill }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const positionObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  // Add spinner animation style on mount (only once)
  useEffect(() => {
    addSpinnerStyle();
  }, []);

  // Enhanced positioning system that tracks field changes and maintains relative positioning
  useEffect(() => {
    const updateButtonPosition = () => {
      if (!buttonRef.current || !fieldElement) return;

      const fieldRect = fieldElement.getBoundingClientRect();

      // Find the optimal parent wrapper for positioning
      const findFieldWrapper = (element: HTMLElement): HTMLElement => {
        let current = element;
        let bestWrapper = element;

        // Walk up the DOM tree to find the most appropriate wrapper
        while (current.parentElement && current.parentElement !== document.body) {
          const parent = current.parentElement;
          const parentRect = parent.getBoundingClientRect();
          const currentRect = current.getBoundingClientRect();

          // Check if parent is a meaningful wrapper (not too much larger than the field)
          const widthRatio = parentRect.width / currentRect.width;
          const heightRatio = parentRect.height / currentRect.height;

          // Good wrapper criteria:
          // 1. Not more than 3x wider or 2x taller than current element
          // 2. Has semantic meaning (form-related classes, fieldset, etc.)
          // 3. Is positioned (has layout context)
          const isReasonableSize = widthRatio <= 3 && heightRatio <= 2;
          const hasSemanticMeaning =
            parent.tagName === "FIELDSET" ||
            parent.tagName === "LABEL" ||
            parent.getAttribute("role") === "group" ||
            /field|input|form|control|wrapper|container/.test(parent.className.toLowerCase());
          const isPositioned = window.getComputedStyle(parent).position !== "static";

          // If this parent meets our criteria, consider it as a wrapper
          if (isReasonableSize && (hasSemanticMeaning || isPositioned)) {
            bestWrapper = parent;
          } else if (widthRatio > 5 || heightRatio > 3) {
            // If parent is too large, stop looking
            break;
          }

          current = parent;
        }

        return bestWrapper;
      };

      // Find the best wrapper for the field
      const fieldWrapper = findFieldWrapper(fieldElement);
      const wrapperRect = fieldWrapper.getBoundingClientRect();

      // Find the field's positioned parent (offsetParent) to determine correct positioning context
      let offsetParent = fieldElement.offsetParent as HTMLElement;

      // If no positioned parent, use document body
      if (!offsetParent) {
        offsetParent = document.body;
      }

      // Get the offset parent's bounding rect to calculate relative positioning
      const offsetParentRect = offsetParent.getBoundingClientRect();

      // Position button at the rightmost top section of the field wrapper
      // This provides better visual alignment with the field's container
      const relativeTop = wrapperRect.top - offsetParentRect.top - 10; // 10px above the wrapper
      const relativeLeft = wrapperRect.right - offsetParentRect.left - 10; // 10px from right edge of wrapper

      const newPosition = {
        top: relativeTop,
        left: relativeLeft,
      };

      setButtonPosition(newPosition);

      // Apply position to button - use absolute positioning within the offset parent context
      const buttonEl = buttonRef.current;

      // Ensure the button is positioned relative to the same context as the field
      if (offsetParent === document.body) {
        // If positioning relative to body, use fixed positioning to handle scrolling
        buttonEl.style.position = "fixed";
        buttonEl.style.top = `${wrapperRect.top - 10}px`;
        buttonEl.style.left = `${wrapperRect.right - 10}px`;
      } else {
        // If there's a positioned parent, use absolute positioning relative to it
        buttonEl.style.position = "absolute";
        buttonEl.style.top = `${newPosition.top}px`;
        buttonEl.style.left = `${newPosition.left}px`;

        // Ensure the button is appended to the correct positioning context
        if (!offsetParent.contains(buttonEl)) {
          // Move button to the positioned parent if it's not already there
          offsetParent.appendChild(buttonEl);
        }
      }

      buttonEl.style.zIndex = "99999";

      // Add visual debugging (remove in production)
      if (process.env.NODE_ENV === "development") {
        console.debug(`Field button positioned at wrapper edge:`, {
          field: fieldElement.tagName + (fieldElement.className ? "." + fieldElement.className : ""),
          wrapper: fieldWrapper.tagName + (fieldWrapper.className ? "." + fieldWrapper.className : ""),
          wrapperSize: { width: wrapperRect.width, height: wrapperRect.height },
          fieldSize: { width: fieldRect.width, height: fieldRect.height },
          position: newPosition,
        });
      }
    };

    // Initial positioning
    updateButtonPosition();

    // Set up ResizeObserver to watch for field dimension changes
    if (window.ResizeObserver) {
      positionObserverRef.current = new ResizeObserver(() => {
        updateButtonPosition();
      });
      positionObserverRef.current.observe(fieldElement);

      // Also observe the field's offset parent for layout changes
      const offsetParent = fieldElement.offsetParent as HTMLElement;
      if (offsetParent && offsetParent !== document.body) {
        positionObserverRef.current.observe(offsetParent);
      }
    }

    // Set up MutationObserver to watch for field attribute/style changes
    mutationObserverRef.current = new MutationObserver(() => {
      // Use requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(updateButtonPosition);
    });

    mutationObserverRef.current.observe(fieldElement, {
      attributes: true,
      attributeFilter: ["style", "class", "data-filliny-loading", "data-filliny-test-mode"],
      subtree: false,
    });

    // Listen for window events that might affect positioning
    const handleWindowEvents = () => {
      requestAnimationFrame(updateButtonPosition);
    };

    window.addEventListener("resize", handleWindowEvents);
    window.addEventListener("scroll", handleWindowEvents, { passive: true });

    // Also listen for potential layout changes from form validation, etc.
    const handleFieldEvents = () => {
      setTimeout(updateButtonPosition, 50); // Small delay to let DOM settle
    };

    fieldElement.addEventListener("input", handleFieldEvents);
    fieldElement.addEventListener("change", handleFieldEvents);
    fieldElement.addEventListener("focus", handleFieldEvents);
    fieldElement.addEventListener("blur", handleFieldEvents);

    // Cleanup function
    return () => {
      if (positionObserverRef.current) {
        positionObserverRef.current.disconnect();
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
      }
      window.removeEventListener("resize", handleWindowEvents);
      window.removeEventListener("scroll", handleWindowEvents);
      fieldElement.removeEventListener("input", handleFieldEvents);
      fieldElement.removeEventListener("change", handleFieldEvents);
      fieldElement.removeEventListener("focus", handleFieldEvents);
      fieldElement.removeEventListener("blur", handleFieldEvents);
    };
  }, [fieldElement]);

  // Handle button click to immediately fill using preferred mode
  const handleButtonClick = (e: React.MouseEvent) => {
    // Ensure the event doesn't propagate and trigger form overlays
    e.preventDefault();
    e.stopPropagation();

    // Try to stop native event propagation for more reliability
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
      e.nativeEvent.stopPropagation?.();
      e.nativeEvent.preventDefault?.();
    }

    // If dropdown is already open, close it
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
      return;
    }

    // Otherwise fill the field using preferred mode from settings
    const preferTestMode = document.body.getAttribute("data-filliny-prefer-test-mode") === "true";
    handleFieldFillWithMode(field, preferTestMode);
  };

  // Handle mouse enter to show dropdown
  const handleMouseEnter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsHovered(true);

    // Show dropdown on hover after a small delay
    setTimeout(() => {
      if (!isDropdownOpen) {
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          // Position dropdown below the button
          setDropdownPosition({
            top: buttonRect.bottom + 5,
            left: Math.max(5, buttonRect.left - 100), // Ensure it's not off-screen to the left
          });
          setIsDropdownOpen(true);
        }
      }
    }, 300); // 300ms delay to prevent accidental triggering
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsHovered(false);

    // Don't close dropdown immediately to allow moving to it
    setTimeout(() => {
      if (!document.querySelector(':hover[data-filliny-dropdown="true"]')) {
        setIsDropdownOpen(false);
      }
    }, 200);
  };

  // Toggle dropdown visibility (for manual toggling)
  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    } else {
      // Calculate dropdown position
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        // Position dropdown below the button
        setDropdownPosition({
          top: buttonRect.bottom + 5,
          left: Math.max(5, buttonRect.left - 100), // Ensure it's not off-screen to the left
        });
        setIsDropdownOpen(true);
      }
    }
  };

  // Handle field filling with selected mode
  const handleFieldFillWithMode = async (field: Field, useTestMode: boolean) => {
    console.log(`Filling field: ${field.id}, using ${useTestMode ? "test" : "API"} mode`);

    setIsLoading(true);
    try {
      if (useTestMode) {
        // Use test mode for a single field
        const getMockValueForFieldType = (type: FieldType, field: Field): string | string[] => {
          const now = new Date();

          switch (type) {
            // Basic input types
            case "text":
              return "Sample text input";
            case "password":
              return "P@ssw0rd123";
            case "email":
              return "test@example.com";
            case "tel":
              return "+1-555-0123";
            case "url":
              return "https://example.com";
            case "search":
              return "search query";
            case "date":
              return now.toISOString().split("T")[0];
            case "datetime-local":
              return now.toISOString().slice(0, 16);
            case "month":
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            case "week": {
              const weekNum = Math.ceil((now.getDate() + 6) / 7);
              return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
            }
            case "time":
              return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            case "number":
            case "range": {
              const min = field.validation?.min ?? 0;
              const max = field.validation?.max ?? 100;
              const step = field.validation?.step ?? 1;
              return String(Math.floor((max - min) / step) * step + min);
            }
            case "color":
              return "#FF0000";
            case "file":
              return "https://example.com/sample.pdf";
            case "checkbox": {
              // If this is a checkbox group (has multiple options), return array of values
              if (field.options && field.options.length > 1) {
                // Select 1-2 random options for checkbox groups
                const numToSelect = Math.min(Math.ceil(Math.random() * 2), field.options.length);
                const shuffled = [...field.options].sort(() => 0.5 - Math.random());
                return shuffled.slice(0, numToSelect).map(opt => opt.value);
              }
              // For single checkbox, return boolean-like value
              return Math.random() > 0.5 ? "true" : "false";
            }
            case "radio": {
              if (field.options?.length) {
                // For radio groups, prefer non-placeholder options
                const nonPlaceholders = field.options.filter(opt => {
                  const text = opt.text.toLowerCase();
                  return !text.includes("select") && !text.includes("choose") && !text.includes("pick") && text !== "";
                });

                if (nonPlaceholders.length > 0) {
                  // Pick a random valid option for better testing variety
                  const randomIndex = Math.floor(Math.random() * nonPlaceholders.length);
                  return nonPlaceholders[randomIndex].value;
                }

                // Fallback to first option
                return field.options[0].value;
              }
              return "true";
            }
            case "select": {
              if (field.options?.length) {
                // Check if this is a multi-select by looking at the actual element
                const element = document.querySelector<HTMLSelectElement>(`[data-filliny-id="${field.id}"]`);
                const isMultiple = element?.multiple || false;

                // Skip placeholder options
                const nonPlaceholders = field.options.filter(opt => {
                  const text = opt.text.toLowerCase();
                  return (
                    !text.includes("select") &&
                    !text.includes("choose") &&
                    !text.includes("pick") &&
                    text !== "" &&
                    opt.value !== ""
                  );
                });

                if (nonPlaceholders.length > 0) {
                  if (isMultiple) {
                    // For multi-select, return array of 1-2 values
                    const numToSelect = Math.min(1 + Math.floor(Math.random() * 2), nonPlaceholders.length);
                    const shuffled = [...nonPlaceholders].sort(() => 0.5 - Math.random());
                    return shuffled.slice(0, numToSelect).map(opt => opt.value);
                  } else {
                    // For single select, pick a random valid option
                    const selectedIndex = Math.floor(Math.random() * nonPlaceholders.length);
                    return nonPlaceholders[selectedIndex].value;
                  }
                }

                // Fallback
                return isMultiple ? [field.options[0].value] : field.options[0].value;
              }
              return "option1";
            }
            case "textarea":
              return `This is a sample textarea content for testing purposes.\nThis form field supports multiple lines of text.\nFeel free to edit this example text.`;
            default:
              return "Sample test value";
          }
        };

        // Generate test value for this specific field
        const mockValue = getMockValueForFieldType(field.type, field);

        // Create a copy of the field with the test value
        const fieldWithTestValue = {
          ...field,
          value: mockValue,
          testValue: mockValue,
        };

        // Use the fieldUpdaterHelpers directly for a single field update
        const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
        if (element) {
          // Mark the field with loading indicator
          element.setAttribute("data-filliny-loading", "true");

          // Import the updateField function asynchronously to avoid circular dependencies
          const { updateField } = await import("./fieldUpdaterHelpers");
          await updateField(element, fieldWithTestValue, true);

          // Remove loading indicator
          element.removeAttribute("data-filliny-loading");

          // Add visual indication of test mode
          element.setAttribute("data-filliny-test-mode", "true");

          // Create a visual indicator for test mode
          const testModeIndicator = document.createElement("div");
          testModeIndicator.textContent = "Test Mode";
          testModeIndicator.style.cssText =
            "position: fixed; top: 20px; right: 20px; background: #4f46e5; color: white; padding: 8px 16px; border-radius: 4px; z-index: 10000; font-weight: bold;";
          document.body.appendChild(testModeIndicator);

          setTimeout(() => testModeIndicator.remove(), 3000);
        }
      } else {
        // Use API mode - call the handleFieldFill function for single field AI processing
        console.log(`Single field AI mode: calling API for field ${field.id}`);

        // Import handleFieldFill asynchronously to avoid circular dependencies
        const { handleFieldFill } = await import("./handleFieldFill");
        await handleFieldFill(field);
      }
    } catch (error) {
      console.error("Error filling field:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Define button styles to match Filliny UI style with fixed positioning
  const buttonStyle: React.CSSProperties = {
    position: "absolute", // Will be set to absolute with calculated coordinates
    top: `${buttonPosition.top}px`,
    left: `${buttonPosition.left}px`,
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: isHovered ? "#4338ca" : "#4f46e5", // Indigo color
    color: "white",
    border: "none",
    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    transform: isHovered ? "scale(1.1)" : "scale(1)",
    opacity: 0.95,
    zIndex: 99999,
    pointerEvents: "auto",
    padding: "0",
    margin: "0",
    outline: "none",
    touchAction: "manipulation",
  };

  // Define spinner styles
  const spinnerStyle: React.CSSProperties = {
    display: "inline-block",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    animation: "filliny-spin 1s linear infinite",
  };

  return (
    <>
      <button
        ref={buttonRef}
        style={buttonStyle}
        onClick={handleButtonClick}
        onContextMenu={toggleDropdown} // Right-click to toggle dropdown
        disabled={isLoading}
        title="Fill this field (hover for options)"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-filliny-element="true"
        type="button">
        {isLoading || fieldElement.getAttribute("data-filliny-loading") === "true" ? (
          <span style={spinnerStyle} data-filliny-element="true" />
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-filliny-element="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </button>

      <FieldFillDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        field={field}
        position={dropdownPosition}
        onSelect={handleFieldFillWithMode}
      />
    </>
  );
};
