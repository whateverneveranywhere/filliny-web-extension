import { clearUserStorage } from '../utils/helpers.js';
import { BackgroundActions } from '../utils/types.js';
import type { GetAuthTokenResponse } from '../utils/types.js';
import { authStorage } from '@extension/storage';
import { useEffect, useState } from 'react';

interface ExtensionAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

/**
 * Hook to handle extension authentication.
 * Retrieves auth token from background service worker and listens for auth changes.
 */
export const useExtensionAuth = (): ExtensionAuthState => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = () => {
      console.log('[useExtensionAuth] Initializing auth - sending GET_AUTH_TOKEN request');

      try {
        chrome.runtime.sendMessage(
          { action: BackgroundActions.GET_AUTH_TOKEN },
          (response: GetAuthTokenResponse) => {
            if (!isMounted) {
              console.log('[useExtensionAuth] Component unmounted, ignoring response');
              return;
            }

            // Check for Chrome API error
            if (chrome.runtime.lastError) {
              console.error('[useExtensionAuth] Chrome API error:', chrome.runtime.lastError.message);
              clearUserStorage();
              setToken(null);
              setIsLoading(false);
              return;
            }

            // Log the actual response structure
            console.log('[useExtensionAuth] GET_AUTH_TOKEN response:', {
              hasResponse: !!response,
              hasSuccess: response?.success !== undefined,
              hasToken: response?.success?.token !== undefined,
              tokenValue: response?.success?.token ? '***' : 'null',
            });

            // Parse response correctly: response.success.token
            const authToken = response?.success?.token;

            if (authToken && typeof authToken === 'string') {
              console.log('[useExtensionAuth] Token found, storing and setting state');
              authStorage.setToken(authToken);
              setToken(authToken);
            } else {
              console.log('[useExtensionAuth] No valid token in response, clearing storage');
              clearUserStorage();
              setToken(null);
            }

            setIsLoading(false);
          },
        );
      } catch (error) {
        console.error('[useExtensionAuth] Error sending GET_AUTH_TOKEN message:', error);
        if (isMounted) {
          clearUserStorage();
          setToken(null);
          setIsLoading(false);
        }
      }
    };

    // Initial auth check
    initializeAuth();

    // Listen for auth token changes from background worker
    const handleMessage = (
      message: { action: BackgroundActions; payload?: { success?: { token?: string | null } } },
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ) => {
      if (!isMounted) {
        return;
      }

      if (message.action === BackgroundActions.AUTH_TOKEN_CHANGED) {
        console.log('[useExtensionAuth] AUTH_TOKEN_CHANGED message received');

        const newToken = message.payload?.success?.token;

        console.log('[useExtensionAuth] New token value:', newToken ? '***' : 'null');

        if (newToken && typeof newToken === 'string') {
          console.log('[useExtensionAuth] Storing new token');
          authStorage.setToken(newToken);
          setToken(newToken);
        } else {
          console.log('[useExtensionAuth] Clearing token and storage');
          clearUserStorage();
          setToken(null);
        }
      }
    };

    // Add listener for token changes
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return {
    isAuthenticated: !!token,
    isLoading,
    token,
  };
};
