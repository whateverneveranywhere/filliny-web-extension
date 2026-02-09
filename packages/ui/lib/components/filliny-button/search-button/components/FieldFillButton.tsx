import { getScrollableAncestors } from '../overlayUtils';
import { cn } from '@/lib/utils';
import { getConfig, WebappEnvs } from '@extension/shared';
import { Sparkles, Loader2, TestTube } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Field } from '@extension/shared';
import type * as React from 'react';

// Button size constant for positioning calculations
const BUTTON_SIZE = 24;
const VERTICAL_MARGIN = 4;

// Check if we're in development mode
const isDev = getConfig().webappEnv === WebappEnvs.DEV;

// Glass button styles - very intense blur, nearly opaque
const glassButtonClasses = cn(
  'filliny-flex filliny-items-center filliny-justify-center',
  'filliny-size-6 filliny-min-h-6 filliny-min-w-6 filliny-max-h-6 filliny-max-w-6',
  '!filliny-rounded-full filliny-aspect-square',
  // Gray glass design - very intense blur, nearly opaque
  'filliny-bg-zinc-800/90 filliny-backdrop-blur-3xl',
  '!filliny-text-white',
  'filliny-border filliny-border-white/10 filliny-shadow-sm',
  'filliny-cursor-pointer filliny-transition-all filliny-duration-150',
  // Hover - subtle bg change only, icon stays white
  'hover:filliny-bg-zinc-700/95 hover:filliny-border-white/15 hover:filliny-scale-110 hover:!filliny-text-white',
  'active:filliny-scale-95',
  'disabled:filliny-opacity-60 disabled:filliny-cursor-not-allowed',
);

interface FieldFillButtonProps {
  fieldElement: HTMLElement;
  field: Field;
  onFill: (field: Field, useTestMode: boolean) => Promise<void>;
}

export const FieldFillButton: React.FC<FieldFillButtonProps> = ({ fieldElement, field, onFill }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'ai' | 'test' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  // Position button ABOVE the field, at the exact top-right corner
  const updateButtonPosition = useCallback(() => {
    if (!containerRef.current || !fieldElement) return;

    try {
      const fieldRect = fieldElement.getBoundingClientRect();

      const newPosition = {
        top: fieldRect.top - BUTTON_SIZE - VERTICAL_MARGIN + window.scrollY,
        left: fieldRect.right - BUTTON_SIZE + window.scrollX,
      };

      setButtonPosition(newPosition);
    } catch (error) {
      console.debug('Error updating button position:', error);
    }
  }, [fieldElement]);

  // Set up positioning and observers
  useEffect(() => {
    if (!fieldElement?.isConnected) return;

    updateButtonPosition();

    resizeObserverRef.current = new ResizeObserver(() => {
      requestAnimationFrame(updateButtonPosition);
    });
    resizeObserverRef.current.observe(fieldElement);

    mutationObserverRef.current = new MutationObserver(() => {
      requestAnimationFrame(updateButtonPosition);
    });
    mutationObserverRef.current.observe(fieldElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const handleWindowEvents = () => requestAnimationFrame(updateButtonPosition);
    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, { passive: true });

    // Track scrollable ancestor containers
    const scrollableAncestors = getScrollableAncestors(fieldElement);
    for (const ancestor of scrollableAncestors) {
      ancestor.addEventListener('scroll', handleWindowEvents, { passive: true });
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents);
      for (const ancestor of scrollableAncestors) {
        ancestor.removeEventListener('scroll', handleWindowEvents);
      }
    };
  }, [fieldElement, updateButtonPosition]);

  // Handle AI fill action
  const handleAIFill = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingMode('ai');
    onFill(field, false)
      .catch(error => console.error('Error filling field with AI:', error))
      .finally(() => {
        setIsLoading(false);
        setLoadingMode(null);
      });
  }, [isLoading, onFill, field]);

  // Handle Test fill action (dev only)
  const handleTestFill = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingMode('test');
    onFill(field, true)
      .catch(error => console.error('Error filling field with test data:', error))
      .finally(() => {
        setIsLoading(false);
        setLoadingMode(null);
      });
  }, [isLoading, onFill, field]);

  // Keyboard shortcut: Ctrl+Shift+. to fill with AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== fieldElement) return;
      if (isLoading) return;

      if (e.ctrlKey && e.shiftKey && e.key === '.') {
        e.preventDefault();
        e.stopPropagation();
        handleAIFill();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [fieldElement, isLoading, handleAIFill]);

  return (
    <div
      ref={containerRef}
      className="filliny-absolute filliny-z-[99999] filliny-pointer-events-auto"
      style={{
        top: `${buttonPosition.top}px`,
        left: `${buttonPosition.left}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {/* Buttons first, hover text expands to the RIGHT */}
      <div className="filliny-flex filliny-flex-row filliny-items-center filliny-gap-1.5">
        {/* AI Fill button */}
        <button
          type="button"
          onClick={handleAIFill}
          disabled={isLoading}
          aria-label="Fill field with AI (Ctrl+Shift+.)"
          className={glassButtonClasses}>
          {loadingMode === 'ai' ? (
            <Loader2 className="filliny-size-3 filliny-animate-spin" />
          ) : (
            <Sparkles className="filliny-size-3" />
          )}
        </button>

        {/* Test Fill button - only in dev mode */}
        {isDev && (
          <button
            type="button"
            onClick={handleTestFill}
            disabled={isLoading}
            aria-label="Fill field with test data"
            className={glassButtonClasses}>
            {loadingMode === 'test' ? (
              <Loader2 className="filliny-size-3 filliny-animate-spin" />
            ) : (
              <TestTube className="filliny-size-3" />
            )}
          </button>
        )}

        {/* Hover text - appears to the RIGHT (gray glass design) */}
        <span
          className={cn(
            'filliny-text-xs filliny-font-medium filliny-whitespace-nowrap',
            'filliny-px-2 filliny-py-1 filliny-rounded-md',
            // Gray glass design - very intense blur, nearly opaque
            'filliny-bg-zinc-800/90 filliny-backdrop-blur-3xl',
            '!filliny-text-white',
            'filliny-border filliny-border-white/10 filliny-shadow-sm',
            'filliny-transition-all filliny-duration-150',
            isHovered
              ? 'filliny-opacity-100 filliny-translate-x-0'
              : 'filliny-opacity-0 -filliny-translate-x-2 filliny-pointer-events-none',
          )}>
          {isDev ? 'Fill with AI / Test' : 'Fill with AI'}
        </span>
      </div>
    </div>
  );
};
