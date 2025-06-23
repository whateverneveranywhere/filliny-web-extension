import type React from "react";
import { useState, useEffect, useRef } from "react";
import type { Field } from "@extension/shared";
import { fieldButtonsStorage } from "@extension/storage";
import { useStorage } from "@extension/shared";

interface FieldFillDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  field: Field;
  position: { top: number; left: number };
  onSelect: (field: Field, useTestMode: boolean) => Promise<void>;
}

export const FieldFillDropdown: React.FC<FieldFillDropdownProps> = ({ isOpen, onClose, field, position, onSelect }) => {
  const settings = useStorage(fieldButtonsStorage);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to ensure dropdown stays within viewport
  useEffect(() => {
    // Skip if dropdown isn't open or ref isn't available
    if (!isOpen || !dropdownRef.current) {
      return undefined;
    }

    const adjustPosition = (): void => {
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
        // Position above the button instead
        top = position.top - rect.height - 10;
      }

      // Ensure dropdown doesn't go off-screen at the top
      if (top < 10) {
        top = 10;
      }

      // Apply adjusted position with smooth transition
      setAdjustedPosition({ top, left });

      // Apply the position to the dropdown element
      dropdown.style.top = `${top}px`;
      dropdown.style.left = `${left}px`;
    };

    // Initial adjustment
    adjustPosition();

    // Adjust on window resize or scroll
    const handleWindowChange = (): void => {
      requestAnimationFrame(adjustPosition);
    };

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, { passive: true });

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange);
    };
  }, [isOpen, position]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use capture phase to ensure we catch clicks before they bubble
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

  // Prevent clicks inside dropdown from bubbling up
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent the event from reaching any parent elements
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
    }
  };

  // Handle selection
  const handleSelect = async (useTestMode: boolean, e: React.MouseEvent) => {
    // Ensure the event doesn't propagate and trigger form overlays
    e.preventDefault();
    e.stopPropagation();

    // For extra safety with React synthetic events
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
      e.nativeEvent.stopPropagation?.();
      e.nativeEvent.preventDefault?.();
    }

    try {
      setIsLoading(true);

      // Remember user preference for next time
      await fieldButtonsStorage.setPreferTestMode(useTestMode);

      // Fill the field
      await onSelect(field, useTestMode);
    } catch (error) {
      console.error("Error filling field:", error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Define dropdown styles aligned with Filliny UI
  const dropdownStyle: React.CSSProperties = {
    position: "fixed", // Use fixed positioning to avoid layout issues
    top: `${adjustedPosition.top}px`,
    left: `${adjustedPosition.left}px`,
    backgroundColor: "white",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px 0",
    zIndex: 10000000, // Very high z-index to ensure it's above everything
    minWidth: "160px",
    fontSize: "14px",
    color: "#111",
    border: "1px solid rgba(0,0,0,0.08)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxHeight: "300px",
    overflowY: "auto",
    pointerEvents: "auto",
    // Ensure the dropdown doesn't affect document flow
    isolation: "isolate",
  };

  const headerStyle: React.CSSProperties = {
    padding: "4px 12px 8px",
    fontWeight: "bold",
    borderBottom: "1px solid #eee",
    marginBottom: "4px",
    fontSize: "13px",
    color: "#4f46e5",
  };

  const optionStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    border: "none",
    backgroundColor: "transparent",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontFamily: "inherit",
  };

  const hoverStyle = {
    backgroundColor: "#f3f4f6",
  };

  const activeStyle = {
    backgroundColor: "#eef2ff",
    fontWeight: "bold",
    color: "#4f46e5",
  };

  const loadingStyle: React.CSSProperties = {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    border: "2px solid rgba(79, 70, 229, 0.3)",
    borderTopColor: "#4f46e5",
    animation: "filliny-spin 1s linear infinite",
    marginRight: "8px",
  };

  return (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      data-filliny-element="true"
      data-filliny-dropdown="true"
      onMouseDown={handleDropdownClick} // Prevent mousedown from bubbling
      role="menu"
      tabIndex={0}>
      <div style={headerStyle}>Fill Options</div>

      <button
        style={{
          ...optionStyle,
          ...(settings?.preferTestMode ? activeStyle : {}),
        }}
        onMouseEnter={e => {
          if (!settings?.preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, hoverStyle);
          }
        }}
        onMouseLeave={e => {
          if (!settings?.preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, optionStyle);
          }
        }}
        onClick={e => handleSelect(true, e)}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        type="button"
        role="menuitem"
        disabled={isLoading}>
        {isLoading && <span style={loadingStyle} />}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={settings?.preferTestMode ? "#4f46e5" : "currentColor"}
            strokeWidth="2"
            style={{ marginRight: "8px" }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Test Mode
        </div>
      </button>

      <button
        style={{
          ...optionStyle,
          ...(!settings?.preferTestMode ? activeStyle : {}),
        }}
        onMouseEnter={e => {
          if (settings?.preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, hoverStyle);
          }
        }}
        onMouseLeave={e => {
          if (settings?.preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, optionStyle);
          }
        }}
        onClick={e => handleSelect(false, e)}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        type="button"
        role="menuitem"
        disabled={isLoading}>
        {isLoading && <span style={loadingStyle} />}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={!settings?.preferTestMode ? "#4f46e5" : "currentColor"}
            strokeWidth="2"
            style={{ marginRight: "8px" }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          AI Mode
        </div>
      </button>
    </div>
  );
};
