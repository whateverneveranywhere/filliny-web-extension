import { handleFormClick } from '../handleFormClick';
import { useState, useCallback } from 'react';
import type React from 'react';

interface UseFormFillProps {
  formId: string;
  testMode: boolean;
  onDismiss: () => void;
}

interface UseFormFillReturn {
  handleFillClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
}

/**
 * Custom hook to handle form fill logic.
 * When the fill button is clicked, the overlay stays visible with a loading spinner.
 * The overlay auto-dismisses when filling completes or errors (handled by FormsOverlay).
 */
export const useFormFill = ({ formId, testMode, onDismiss }: UseFormFillProps): UseFormFillReturn => {
  const [clicked, setClicked] = useState(false);

  const handleFillClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (clicked) return;

      // Check if a field-specific test is already in progress
      const fieldTestInProgress = document.querySelector('[data-filliny-loading="true"]');
      if (fieldTestInProgress) {
        console.log('Field test already in progress, not triggering form fill');
        onDismiss();
        return;
      }

      setClicked(true);

      // Fire and forget - handleFormClick manages its own state via formFillStore.
      // The overlay stays visible and shows a spinner; FormsOverlay handles auto-dismiss.
      handleFormClick(event, formId, testMode).catch(() => {
        // Errors are handled inside handleFormClick (sets phase to ERROR, shows toasts)
      });
    },
    [clicked, formId, testMode, onDismiss],
  );

  return {
    handleFillClick,
  };
};
