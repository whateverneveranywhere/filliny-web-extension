import { MessageType } from '../types/enums.js';
import { clearUserStorage } from '../utils/helpers.js';
import { BackgroundActions, GetAuthTokenResponseSchema } from '../utils/types.js';
import { authStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import type { GetAuthTokenResponse } from '../utils/types.js';

// ============================================================================
// Extension Auth State Schema
// ============================================================================

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
        chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, (response: GetAuthTokenResponse) => {
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

          // Parse response using Zod schema for type safety
          const parseResult = GetAuthTokenResponseSchema.safeParse(response);

          if (parseResult.success && parseResult.data.success?.token) {
            const authToken = parseResult.data.success.token;
            console.log('[useExtensionAuth] Token found, storing and setting state');
            authStorage.setToken(authToken);
            setToken(authToken);
          } else {
            console.log('[useExtensionAuth] No valid token in response, clearing storage');
            clearUserStorage();
            setToken(null);
          }

          setIsLoading(false);
        });
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
    // Handles both cookie-based (AUTH_TOKEN_CHANGED) and webapp-based (SET/CLEAR_BEARER_TOKEN) messages
    const handleMessage = (message: {
      action?: BackgroundActions;
      type?: string;
      token?: string;
      payload?: { success?: { token?: string | null } };
    }) => {
      if (!isMounted) {
        return;
      }

      // Handle cookie-based auth change
      if (message.action === BackgroundActions.AUTH_TOKEN_CHANGED) {
        console.log('[useExtensionAuth] AUTH_TOKEN_CHANGED message received');

        // Validate payload using Zod schema
        const payloadParseResult = GetAuthTokenResponseSchema.safeParse(message.payload);
        const newToken = payloadParseResult.success ? payloadParseResult.data.success?.token : null;

        console.log('[useExtensionAuth] New token value:', newToken ? '***' : 'null');

        if (newToken) {
          console.log('[useExtensionAuth] Storing new token');
          authStorage.setToken(newToken);
          setToken(newToken);
        } else {
          console.log('[useExtensionAuth] Clearing token and storage');
          clearUserStorage();
          setToken(null);
        }
      }

      // Handle webapp-based bearer token set (login from webapp)
      if (message.type === MessageType.SET_BEARER_TOKEN) {
        console.log('[useExtensionAuth] SET_BEARER_TOKEN message received');
        // Re-initialize auth to pick up the new token
        initializeAuth();
      }

      // Handle webapp-based bearer token clear (logout from webapp)
      if (message.type === MessageType.CLEAR_BEARER_TOKEN) {
        console.log('[useExtensionAuth] CLEAR_BEARER_TOKEN message received');
        clearUserStorage();
        setToken(null);
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
