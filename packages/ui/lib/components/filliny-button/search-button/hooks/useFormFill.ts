import { handleFormClick } from '../handleFormClick';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from '../overlayUtils';
import { formFillStore, useFormFillStore, StreamingPhase } from '../stores';
import { useState, useCallback, useEffect, useRef } from 'react';
import type React from 'react';

interface UseFormFillProps {
  formId: string;
  testMode: boolean;
  onDismiss: () => void;
}

interface UseFormFillReturn {
  loading: boolean;
  phase: StreamingPhase;
  handleFillClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
}

/**
 * Custom hook to handle form fill logic
 * Separates form fill handling from component rendering
 */
export const useFormFill = ({ formId, testMode, onDismiss }: UseFormFillProps): UseFormFillReturn => {
  const [loading, setLoading] = useState(false);
  const phase = useFormFillStore(state => state.phase);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase-based auto-dismissal.
  // Dismiss order matters: call onDismiss first to unmount the component,
  // then reset store state. This prevents a brief flash of the action buttons.
  useEffect(() => {
    if (phase === StreamingPhase.COMPLETE) {
      dismissTimerRef.current = setTimeout(() => {
        setLoading(false);
        resetOverlays();
        onDismiss();
        formFillStore.getState().reset();
      }, 2500);
    } else if (phase === StreamingPhase.ERROR) {
      dismissTimerRef.current = setTimeout(() => {
        setLoading(false);
        resetOverlays();
        onDismiss();
        formFillStore.getState().reset();
      }, 3500);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [phase, onDismiss]);

  const handleFillClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) return;

      // Check if a field-specific test is already in progress
      const fieldTestInProgress = document.querySelector('[data-filliny-loading="true"]');
      if (fieldTestInProgress) {
        console.log('Field test already in progress, not triggering form fill');
        onDismiss();
        return;
      }

      setLoading(true);
      disableOtherButtons(formId);
      showLoadingIndicator(formId);

      try {
        await handleFormClick(event, formId, testMode);
      } catch {
        // Error handling is done inside handleFormClick.
        // Phase will be set to ERROR, triggering auto-dismiss via useEffect above.
      }
    },
    [loading, formId, testMode, onDismiss],
  );

  return {
    loading,
    phase,
    handleFillClick,
  };
};
