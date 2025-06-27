import { useStorage } from "@extension/shared";
import { fieldButtonsStorage } from "@extension/storage";
import { useState, useEffect, useRef } from "react";
import type { ButtonComponentProps } from "../button-wrapper";
import type React from "react";

interface ModeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  preferTestMode: boolean;
  onSelectMode: (useTestMode: boolean) => Promise<void>;
}

const ModeDropdown: React.FC<ModeDropdownProps> = ({ isOpen, onClose, position, preferTestMode, onSelectMode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent clicks inside dropdown from bubbling up
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSelect = async (useTestMode: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsLoading(true);
      await onSelectMode(useTestMode);
    } catch (error) {
      console.error("Error setting mode preference:", error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Define styles
  const dropdownStyle: React.CSSProperties = {
    position: "fixed",
    top: `${position.top}px`,
    left: `${position.left}px`,
    backgroundColor: "white",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px 0",
    zIndex: 9999999,
    minWidth: "160px",
    fontSize: "14px",
    color: "#111",
    border: "1px solid rgba(0,0,0,0.08)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxHeight: "300px",
    overflowY: "auto",
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
      onClick={handleDropdownClick}
      onKeyDown={e => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      role="menu"
      tabIndex={0}>
      <div style={headerStyle}>Default Fill Mode</div>

      <button
        style={{
          ...optionStyle,
          ...(preferTestMode ? activeStyle : {}),
        }}
        onMouseEnter={e => {
          if (!preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, hoverStyle);
          }
        }}
        onMouseLeave={e => {
          if (!preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, optionStyle);
          }
        }}
        onClick={e => handleSelect(true, e)}
        type="button"
        role="menuitem">
        {isLoading && <span style={loadingStyle} />}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={preferTestMode ? "#4f46e5" : "currentColor"}
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
          ...(!preferTestMode ? activeStyle : {}),
        }}
        onMouseEnter={e => {
          if (preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, hoverStyle);
          }
        }}
        onMouseLeave={e => {
          if (preferTestMode) {
            const target = e.currentTarget;
            Object.assign(target.style, optionStyle);
          }
        }}
        onClick={e => handleSelect(false, e)}
        type="button"
        role="menuitem">
        {isLoading && <span style={loadingStyle} />}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={!preferTestMode ? "#4f46e5" : "currentColor"}
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

export const FieldButtonToggle: React.FC<ButtonComponentProps> = ({
  isHovered: _isHovered,
  isDragging: _isDragging,
}) => {
  const settings = useStorage(fieldButtonsStorage);
  const [isActive, setIsActive] = useState<boolean>(settings?.enabled ?? true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (settings) {
      setIsActive(settings.enabled);
    }
  }, [settings]);

  // Handle button click - toggle enabled state
  const handleToggle = async () => {
    const newState = await fieldButtonsStorage.toggleEnabled();
    setIsActive(newState);
  };

  // Show mode selection dropdown on right-click
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      setDropdownPosition({
        top: buttonRect.bottom,
        left: Math.min(
          window.innerWidth - 170, // Ensure it's not off-screen to the right
          Math.max(5, buttonRect.left - 80), // Ensure it's not off-screen to the left
        ),
      });
      setIsDropdownOpen(true);
    }
  };

  // Handle mode selection
  const handleModeSelect = async (useTestMode: boolean) => {
    await fieldButtonsStorage.setPreferTestMode(useTestMode);
  };

  // Define the spinner animation style if it doesn't exist
  useEffect(() => {
    if (!document.getElementById("filliny-spinner-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "filliny-spinner-style";
      styleEl.setAttribute("data-filliny-element", "true");
      styleEl.textContent = `
        @keyframes filliny-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onContextMenu={handleRightClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`${isActive ? "Disable" : "Enable"} field buttons (right-click to set default mode)`}
        style={{
          backgroundColor: isActive ? "#4f46e5" : "#6b7280",
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "all 0.2s ease",
          outline: "none",
          transform: isHovered ? "scale(1.1)" : "scale(1)",
          opacity: 0.95,
        }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          {isActive ? (
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
              {settings?.preferTestMode && <circle cx="19" cy="5" r="3" fill="#4CAF50" stroke="none" />}
            </>
          ) : (
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
              <line x1="4" y1="4" x2="20" y2="20" stroke="red" />
            </>
          )}
        </svg>
      </button>

      <ModeDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        position={dropdownPosition}
        preferTestMode={settings?.preferTestMode ?? false}
        onSelectMode={handleModeSelect}
      />
    </>
  );
};
