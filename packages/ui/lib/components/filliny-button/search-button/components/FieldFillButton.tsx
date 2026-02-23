import { getSharedPositionTracker } from './SharedPositionTracker';
import { useFormFillStore, StreamingPhase, FieldFillStatus } from '../stores';
import { cn } from '@/lib/utils';
import { getConfig, WebappEnvs } from '@extension/shared';
import { Sparkles, Loader2, TestTube, Check, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Field } from '@extension/shared';
import type * as React from 'react';

// Button size constant for positioning calculations
const BUTTON_SIZE = 24;
const INSET = 4;

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
  canFillForms?: boolean;
  disabledReason?: string | null;
}

// Duration to show success/error state before resetting (ms)
const FEEDBACK_DISPLAY_MS = 3000;

export const FieldFillButton: React.FC<FieldFillButtonProps> = ({
  fieldElement,
  field,
  onFill,
  canFillForms = true,
  disabledReason = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'ai' | 'test' | null>(null);
  // Per-field fill result feedback: 'success' | 'error' | null
  const [fillResult, setFillResult] = useState<'success' | 'error' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to bulk fill state for this field
  const bulkPhase = useFormFillStore(state => state.phase);
  const fieldStatus = useFormFillStore(state => state.fields[field.id]?.status);
  const isBulkFilling = bulkPhase === StreamingPhase.STREAMING || bulkPhase === StreamingPhase.FINALIZING;
  const isFieldFilled = fieldStatus === FieldFillStatus.FILLED || fieldStatus === FieldFillStatus.VERIFIED;

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Find the associated label element for a form field.
   * Returns { rect, element } or null if none found.
   * For wrapping labels (field inside <label>), looks for a distinct text-bearing
   * child element (e.g. <span>) that doesn't contain the field, so the button
   * is placed after the label text rather than after the entire wrapper.
   */
  const findLabel = useCallback((): { rect: DOMRect; element: HTMLElement } | null => {
    if (!fieldElement) return null;

    try {
      // Strategy 1: label[for="id"] — separate label element
      const fieldId = fieldElement.id || fieldElement.getAttribute('data-filliny-id');
      if (fieldId) {
        const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(fieldId)}"]`);
        if (label) {
          const rect = label.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return { rect, element: label };
        }
      }

      // Strategy 2: Wrapping <label> parent
      // For wrapping labels, try to find a text-bearing child that is NOT the field
      // so we position next to the label text, not the whole wrapper.
      const parentLabel = fieldElement.closest('label');
      if (parentLabel) {
        // Look for a child span, strong, em, or similar text element before the field
        const children = Array.from(parentLabel.children);
        for (const child of children) {
          if (
            child !== fieldElement &&
            !child.contains(fieldElement) &&
            child instanceof HTMLElement &&
            child.textContent?.trim()
          ) {
            const rect = child.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return { rect, element: child };
          }
        }
        // If no separate text child found, skip wrapping label to avoid positioning
        // after the entire wrapper (which includes the field itself)
      }

      // Strategy 3: aria-labelledby
      const labelledBy = fieldElement.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl instanceof HTMLElement) {
          const rect = labelEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return { rect, element: labelEl };
        }
      }
    } catch {
      // Ignore errors in label finding
    }
    return null;
  }, [fieldElement]);

  // Position button at the right end of the field's label, vertically centered on the label.
  // Falls back to the field's right edge if no label is found.
  const updateButtonPosition = useCallback(() => {
    if (!containerRef.current || !fieldElement) return;

    try {
      const fieldRect = fieldElement.getBoundingClientRect();

      // Skip positioning if element is not visible
      if (fieldRect.width === 0 && fieldRect.height === 0) return;

      let top: number;
      let left: number;

      // Prefer positioning next to the label for ALL field types
      const labelInfo = findLabel();
      if (labelInfo) {
        const { rect: labelRect } = labelInfo;
        top = labelRect.top + (labelRect.height - BUTTON_SIZE) / 2;
        left = labelRect.right + INSET;
      } else {
        // Fallback: position at field's right edge if no label found
        top = fieldRect.top + (fieldRect.height - BUTTON_SIZE) / 2;
        left = fieldRect.right + INSET;
      }

      // Clamp to viewport bounds
      top = Math.max(4, Math.min(top, window.innerHeight - BUTTON_SIZE - 4));
      left = Math.max(4, Math.min(left, window.innerWidth - BUTTON_SIZE - 4));

      setButtonPosition({ top, left });
    } catch (error) {
      console.debug('Error updating button position:', error);
    }
  }, [fieldElement, findLabel]);

  // Set up positioning via shared tracker (1 ResizeObserver + 1 MutationObserver for ALL buttons)
  useEffect(() => {
    if (!fieldElement?.isConnected) return;

    updateButtonPosition();

    const labelInfo = findLabel();
    const tracker = getSharedPositionTracker();
    tracker.track(fieldElement, updateButtonPosition, labelInfo?.element ?? null);

    return () => {
      tracker.untrack(fieldElement);
    };
  }, [fieldElement, findLabel, updateButtonPosition]);

  // Show brief feedback (success/error) then reset after delay
  const showFeedback = useCallback(
    (result: 'success' | 'error') => {
      // Clear any previous feedback timer
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setFillResult(result);
      feedbackTimerRef.current = setTimeout(() => {
        setFillResult(null);
        feedbackTimerRef.current = null;
      }, FEEDBACK_DISPLAY_MS);
    },
    [], // no deps - setFillResult is a state setter (stable)
  );

  // Clean up feedback timer on unmount
  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  // Handle AI fill action
  const handleAIFill = useCallback(() => {
    if (isLoading || fillResult || !canFillForms) return;

    setIsLoading(true);
    setLoadingMode('ai');
    setFillResult(null);
    onFill(field, false)
      .then(() => showFeedback('success'))
      .catch(error => {
        console.error('Error filling field with AI:', error);
        showFeedback('error');
      })
      .finally(() => {
        setIsLoading(false);
        setLoadingMode(null);
      });
  }, [isLoading, fillResult, canFillForms, onFill, field, showFeedback]);

  // Handle Test fill action (dev only)
  const handleTestFill = useCallback(() => {
    if (isLoading || fillResult) return;

    setIsLoading(true);
    setLoadingMode('test');
    setFillResult(null);
    onFill(field, true)
      .then(() => showFeedback('success'))
      .catch(error => {
        console.error('Error filling field with test data:', error);
        showFeedback('error');
      })
      .finally(() => {
        setIsLoading(false);
        setLoadingMode(null);
      });
  }, [isLoading, fillResult, onFill, field, showFeedback]);

  // Track field focus to reduce button opacity during typing
  useEffect(() => {
    if (!fieldElement) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    fieldElement.addEventListener('focus', handleFocus);
    fieldElement.addEventListener('blur', handleBlur);

    return () => {
      fieldElement.removeEventListener('focus', handleFocus);
      fieldElement.removeEventListener('blur', handleBlur);
    };
  }, [fieldElement]);

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
      className="filliny-fixed filliny-z-[99999] filliny-pointer-events-auto filliny-transition-opacity filliny-duration-150"
      style={{
        position: 'fixed',
        top: `${buttonPosition.top}px`,
        left: `${buttonPosition.left}px`,
        opacity: isFocused && !isHovered && canFillForms ? 0.6 : 1,
        zIndex: 2147483646,
        // Explicit sizing to prevent host page CSS from collapsing our container
        fontSize: '16px',
        lineHeight: '1.5',
        boxSizing: 'border-box',
      }}
      title={!canFillForms ? disabledReason || 'Form filling unavailable' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {/* Buttons first, hover text expands to the RIGHT */}
      <div className="filliny-flex filliny-flex-row filliny-items-center filliny-gap-1.5">
        {/* AI Fill button - shows streaming state during bulk fill, or per-field feedback */}
        <button
          type="button"
          onClick={handleAIFill}
          disabled={isLoading || isBulkFilling || fillResult !== null || !canFillForms}
          aria-label={
            !canFillForms ? disabledReason || 'Form filling unavailable' : 'Fill field with AI (Ctrl+Shift+.)'
          }
          className={cn(
            glassButtonClasses,
            fillResult === 'error' && '!filliny-bg-red-900/90 !filliny-border-red-500/30',
            fillResult === 'success' && '!filliny-bg-green-900/90 !filliny-border-green-500/30',
          )}
          style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', padding: 0 }}>
          {/* Per-field feedback states (highest priority) */}
          {fillResult === 'success' ? (
            <Check className="filliny-size-3 filliny-text-green-400" />
          ) : fillResult === 'error' ? (
            <AlertCircle className="filliny-size-3 filliny-text-red-400" />
          ) : /* Bulk fill states */
          isBulkFilling && isFieldFilled ? (
            <Check className="filliny-size-3 filliny-text-green-400" />
          ) : isBulkFilling ? (
            <Loader2 className="filliny-size-3 filliny-animate-spin filliny-text-white/60" />
          ) : /* Per-field loading */
          loadingMode === 'ai' ? (
            <Loader2 className="filliny-size-3 filliny-animate-spin" />
          ) : (
            <Sparkles className="filliny-size-3" />
          )}
        </button>

        {/* Test Fill button - only in dev mode, hidden during bulk fill */}
        {isDev && !isBulkFilling && !fillResult && (
          <button
            type="button"
            onClick={handleTestFill}
            disabled={isLoading}
            aria-label="Fill field with test data"
            className={glassButtonClasses}
            style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', padding: 0 }}>
            {loadingMode === 'test' ? (
              <Loader2 className="filliny-size-3 filliny-animate-spin" />
            ) : (
              <TestTube className="filliny-size-3" />
            )}
          </button>
        )}

        {/* Hover text - appears to the RIGHT (gray glass design), hidden during bulk fill and feedback */}
        {!isBulkFilling && !fillResult && (
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
            {!canFillForms
              ? disabledReason || 'Form filling unavailable'
              : isDev
                ? 'Fill with AI / Test'
                : 'Fill with AI'}
          </span>
        )}
      </div>
    </div>
  );
};
