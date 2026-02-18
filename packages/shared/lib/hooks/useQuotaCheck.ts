import { MessageType } from '../types/enums.js';
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

/**
 * Schema for the background-script response to GET_QUOTA_STATUS.
 * The background script always returns these fields from fetchQuotaStatus.
 */
const QuotaStatusResponseSchema = z.object({
  canFillForms: z.boolean(),
  isPro: z.boolean(),
  tokensRemaining: z.number(),
  freeFormsRemaining: z.number(),
  success: z.boolean().optional(),
});

type QuotaStatusResponse = z.infer<typeof QuotaStatusResponseSchema>;

interface QuotaStatus {
  canFillForms: boolean;
  isLoading: boolean;
  /** Human-readable reason why filling is disabled, for tooltip use. Null when enabled. */
  disabledReason: string | null;
}

/**
 * Compute a user-facing reason string from the background quota response.
 */
const computeDisabledReason = (response: QuotaStatusResponse): string | null => {
  if (response.canFillForms) return null;

  if (response.isPro) {
    return 'Token limit reached. Tokens refresh on your billing cycle.';
  }
  return 'No free forms remaining. Upgrade to Pro for unlimited filling.';
};

/**
 * Lightweight hook for content-UI to check if the user can fill forms.
 * Sends a GET_QUOTA_STATUS message to the background script and listens
 * for REFRESH_USAGE messages to re-check after fills.
 */
export const useQuotaCheck = (): QuotaStatus => {
  const [canFillForms, setCanFillForms] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);

  const checkQuota = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setIsLoading(false);
      return;
    }

    chrome.runtime.sendMessage({ type: MessageType.GET_QUOTA_STATUS }, rawResponse => {
      if (chrome.runtime.lastError) {
        // On error, assume user can fill (don't block)
        setCanFillForms(true);
        setDisabledReason(null);
      } else {
        const result = QuotaStatusResponseSchema.safeParse(rawResponse);
        if (result.success) {
          const response = result.data;
          const allowed = response.canFillForms;
          setCanFillForms(allowed);
          setDisabledReason(allowed ? null : computeDisabledReason(response));
        } else {
          // Permissive default on parse failure
          setCanFillForms(true);
          setDisabledReason(null);
        }
      }
      setIsLoading(false);
    });
  }, []);

  // Check quota on mount
  useEffect(() => {
    checkQuota();
  }, [checkQuota]);

  // Re-check when REFRESH_USAGE is broadcast (after a form fill)
  // Also re-check when auth state changes (login/logout)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleMessage = (message: { type: string }) => {
      if (
        message.type === MessageType.REFRESH_USAGE ||
        message.type === MessageType.SET_BEARER_TOKEN ||
        message.type === MessageType.CLEAR_BEARER_TOKEN
      ) {
        checkQuota();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [checkQuota]);

  return { canFillForms, isLoading, disabledReason };
};
