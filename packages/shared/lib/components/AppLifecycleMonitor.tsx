import { MessageType } from '../types/enums.js';
import { getShadowAppCleanup } from '../utils/init-app-with-shadow.js';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface AppLifecycleMonitorProps {
  /** The ID of the shadow app to monitor */
  shadowAppId: string;
  /** Whether the extension UI should be visible */
  shouldBeVisible: boolean;
  /** Children to render when visible */
  children: ReactNode;
  /** Optional callback when cleanup is triggered */
  onCleanup?: () => void;
}

/**
 * Component that monitors the extension's lifecycle and triggers cleanup
 * when the extension should no longer be displayed on the current page.
 *
 * This handles cases like:
 * - Website removed from the supported list
 * - User logs out
 * - Profile changes that affect website support
 */
export const AppLifecycleMonitor = ({
  shadowAppId,
  shouldBeVisible,
  children,
  onCleanup,
}: AppLifecycleMonitorProps): ReactNode => {
  const hasTriggeredCleanup = useRef(false);
  const previousVisibility = useRef(shouldBeVisible);

  // Monitor visibility changes and trigger cleanup when needed
  useEffect(() => {
    // If visibility changed from true to false, trigger cleanup
    if (previousVisibility.current && !shouldBeVisible && !hasTriggeredCleanup.current) {
      hasTriggeredCleanup.current = true;

      console.log(`[Filliny] Visibility changed to false for ${shadowAppId}, triggering cleanup`);

      // Call optional cleanup callback
      if (onCleanup) {
        onCleanup();
      }

      // Delay cleanup slightly to allow any animations or state updates
      const cleanupTimeout = setTimeout(() => {
        const cleanup = getShadowAppCleanup(shadowAppId);
        if (cleanup) {
          cleanup();
        }
      }, 100);

      return () => {
        clearTimeout(cleanupTimeout);
      };
    }

    previousVisibility.current = shouldBeVisible;
    return undefined;
  }, [shouldBeVisible, shadowAppId, onCleanup]);

  // Listen for external cleanup requests via chrome messaging
  useEffect(() => {
    const handleMessage = (message: { type: MessageType }) => {
      if (message.type === MessageType.REMOVE_EXTENSION_UI && !hasTriggeredCleanup.current) {
        hasTriggeredCleanup.current = true;
        console.log(`[Filliny] Received REMOVE_EXTENSION_UI message for ${shadowAppId}`);

        if (onCleanup) {
          onCleanup();
        }

        const cleanup = getShadowAppCleanup(shadowAppId);
        if (cleanup) {
          cleanup();
        }
      }
    };

    // Only add listener if chrome.runtime is available
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
    return undefined;
  }, [shadowAppId, onCleanup]);

  // Reset cleanup flag if visibility becomes true again
  useEffect(() => {
    if (shouldBeVisible) {
      hasTriggeredCleanup.current = false;
    }
  }, [shouldBeVisible]);

  // Render children only when visible
  if (!shouldBeVisible) {
    return null;
  }

  return children;
};
