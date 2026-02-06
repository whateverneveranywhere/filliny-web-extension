import { handleFormClick } from '../handleFormClick';
import { disableOtherButtons, showLoadingIndicator } from '../overlayUtils';
import { useFormFillStore } from '../stores';
import { useState, useCallback } from 'react';
import type { StreamingPhase } from '../stores';
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
      } finally {
        setLoading(false);
        onDismiss();
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
