import { ModeDropdown } from './ModeDropdown';
import { cn } from '@/lib/utils';
import { useStorage } from '@extension/shared';
import { fieldButtonsStorage } from '@extension/storage';
import { useState, useEffect, useRef } from 'react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

export const FieldButtonToggle: React.FC<ButtonComponentProps> = () => {
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

  // Note: Spinner animation is now defined globally in global.css as filliny-spin

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onContextMenu={handleRightClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`${isActive ? 'Disable' : 'Enable'} field buttons (right-click to set default mode)`}
        className={cn(
          'filliny-w-7 filliny-h-7 filliny-rounded-full',
          'filliny-flex filliny-items-center filliny-justify-center',
          'filliny-text-primary-foreground filliny-border-none filliny-cursor-pointer',
          'filliny-shadow-md filliny-transition-all filliny-duration-200 filliny-ease-in-out',
          'filliny-outline-none filliny-opacity-95',
          'hover:filliny-scale-110',
          isActive ? 'filliny-bg-primary' : 'filliny-bg-secondary filliny-text-secondary-foreground',
          isHovered && 'filliny-scale-110',
        )}>
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
