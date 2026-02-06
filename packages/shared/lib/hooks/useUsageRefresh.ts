/**
 * Hook to listen for usage refresh messages from the background script
 * and invalidate relevant queries to update the UI.
 *
 * This is triggered after a form fill completes to ensure the usage count
 * displayed in the sidebar updates immediately.
 */
import { queryKeys } from './queryKeys.js';
import { MessageType } from '../types/enums.js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Message type for Chrome runtime messages
 */
interface RuntimeMessage {
  type: string;
}

/**
 * useUsageRefresh - Listens for REFRESH_USAGE messages and invalidates usage-related queries.
 *
 * This hook sets up a Chrome runtime message listener that triggers query invalidation
 * when the background script broadcasts a REFRESH_USAGE message after a form fill completes.
 *
 * Should be used in a component that's always mounted when the side panel is open,
 * such as the QueryProvider wrapper or the main App component.
 *
 * @example
 * ```tsx
 * const App = () => {
 *   useUsageRefresh();
 *   return <MainContent />;
 * };
 * ```
 */
export const useUsageRefresh = (): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMessage = (message: RuntimeMessage) => {
      if (message.type === MessageType.REFRESH_USAGE) {
        // Invalidate auth health check (contains freeFormsRemaining for free users)
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });

        // Invalidate dashboard overview (contains remainingTokens and freeFormsRemaining)
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
    };

    // Add listener for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [queryClient]);
};
