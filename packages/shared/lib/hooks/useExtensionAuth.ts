import { clearUserStorage } from '../utils/helpers.js';
import { BackgroundActions } from '../utils/types.js';
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
    // Initial auth check
    chrome.runtime.sendMessage({ action: BackgroundActions.GET_AUTH_TOKEN }, response => {
      if (response && response.success && response.success.token) {
        authStorage.setToken(response.success.token);
        setToken(response.success.token);
      } else {
        clearUserStorage();
        setToken(null);
      }
      setIsLoading(false);
    });

    // Listen for auth token changes
    const handleMessage = (message: { action: BackgroundActions; payload?: { success?: { token?: string } } }) => {
      if (message.action === BackgroundActions.AUTH_TOKEN_CHANGED) {
        const newToken = message.payload?.success?.token;
        if (newToken) {
          authStorage.setToken(newToken);
          setToken(newToken);
        } else {
          clearUserStorage();
          setToken(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return {
    isAuthenticated: !!token,
    isLoading,
    token,
  };
};
