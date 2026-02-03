import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import type React from 'react';

export interface ModeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  preferTestMode: boolean;
  onSelectMode: (useTestMode: boolean) => Promise<void>;
}

export const ModeDropdown: React.FC<ModeDropdownProps> = ({
  isOpen,
  onClose,
  position,
  preferTestMode,
  onSelectMode,
}) => {
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
      isActive ? 'filliny-bg-primary/10 filliny-font-bold filliny-text-primary' : 'hover:filliny-bg-muted',
    );

  const loadingSpinnerClasses =
    'filliny-inline-block filliny-w-3.5 filliny-h-3.5 filliny-rounded-full filliny-border-2 filliny-border-primary/30 filliny-border-t-primary filliny-animate-spin filliny-mr-2';

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'filliny-fixed filliny-bg-popover filliny-rounded-md filliny-shadow-lg',
        'filliny-py-2 filliny-z-filliny-max filliny-min-w-[160px]',
        'filliny-text-sm filliny-text-popover-foreground filliny-border filliny-border-border',
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
          'filliny-border-b filliny-border-border filliny-mb-1',
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
