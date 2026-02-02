import { cn } from '@/lib/utils';
import { useStorage } from '@extension/shared';
import { fieldButtonsStorage } from '@extension/storage';
import { useState, useEffect, useRef } from 'react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      console.error('Error setting mode preference:', error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Define base classes for dropdown options
  const optionBaseClasses =
    'filliny-py-2 filliny-px-3 filliny-cursor-pointer filliny-flex filliny-items-center filliny-w-full filliny-text-left filliny-border-none filliny-bg-transparent filliny-transition-all filliny-duration-200 filliny-ease-in-out';

  const getOptionClasses = (isActive: boolean) =>
    cn(
      optionBaseClasses,
      isActive ? 'filliny-bg-indigo-50 filliny-font-bold filliny-text-primary' : 'hover:filliny-bg-gray-100',
    );

  const loadingSpinnerClasses =
    'filliny-inline-block filliny-w-3.5 filliny-h-3.5 filliny-rounded-full filliny-border-2 filliny-border-primary/30 filliny-border-t-primary filliny-animate-spin filliny-mr-2';

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'filliny-fixed filliny-bg-white filliny-rounded-md filliny-shadow-lg',
        'filliny-py-2 filliny-z-filliny-max filliny-min-w-[160px]',
        'filliny-text-sm filliny-text-gray-900 filliny-border filliny-border-black/10',
        'filliny-font-sans filliny-max-h-[300px] filliny-overflow-y-auto',
      )}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      data-filliny-element="true"
      data-filliny-dropdown="true"
      onClick={handleDropdownClick}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      role="menu"
      tabIndex={0}>
      <div
        className={cn(
          'filliny-px-3 filliny-pt-1 filliny-pb-2 filliny-font-bold',
          'filliny-border-b filliny-border-gray-200 filliny-mb-1',
          'filliny-text-[13px] filliny-text-primary',
        )}>
        Default Fill Mode
      </div>

      <button
        className={getOptionClasses(preferTestMode)}
        onClick={e => handleSelect(true, e)}
        type="button"
        role="menuitem">
        {isLoading && <span className={loadingSpinnerClasses} />}
        <div className="filliny-flex filliny-items-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('filliny-mr-2', preferTestMode && 'filliny-text-primary')}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Test Mode
        </div>
      </button>

      <button
        className={getOptionClasses(!preferTestMode)}
        onClick={e => handleSelect(false, e)}
        type="button"
        role="menuitem">
        {isLoading && <span className={loadingSpinnerClasses} />}
        <div className="filliny-flex filliny-items-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('filliny-mr-2', !preferTestMode && 'filliny-text-primary')}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          AI Mode
        </div>
      </button>
    </div>
  );
};

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
          'filliny-text-white filliny-border-none filliny-cursor-pointer',
          'filliny-shadow-md filliny-transition-all filliny-duration-200 filliny-ease-in-out',
          'filliny-outline-none filliny-opacity-95',
          'hover:filliny-scale-110',
          isActive ? 'filliny-bg-primary' : 'filliny-bg-secondary',
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
