import { MessageType } from '../types/enums.js';
import { getShadowAppCleanup } from '../utils/init-app-with-shadow.js';
import { useEffect } from 'react';
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
 * Component that monitors the extension's lifecycle and toggles visibility
 * of the shadow DOM host element based on whether the extension should be shown.
 *
 * Visibility changes (e.g. website removed/added from profile) hide/show the
 * shadow DOM container but keep the React app alive so it can re-appear when
 * the profile is updated again. Only an explicit REMOVE_EXTENSION_UI message
 * will fully destroy the shadow DOM and unmount React.
 */
export const AppLifecycleMonitor = ({
  shadowAppId,
  shouldBeVisible,
  children,
  onCleanup,
}: AppLifecycleMonitorProps): ReactNode => {
  // Toggle the shadow DOM host element's display so it takes no space when hidden
  useEffect(() => {
    const hostElement = document.getElementById(shadowAppId);
    if (hostElement) {
      hostElement.style.display = shouldBeVisible ? 'block' : 'none';
    }
  }, [shouldBeVisible, shadowAppId]);

  // Listen for explicit cleanup requests via chrome messaging (e.g. extension uninstall)
  useEffect(() => {
    const handleMessage = (message: { type: MessageType }) => {
      if (message.type === MessageType.REMOVE_EXTENSION_UI) {
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

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
    return undefined;
  }, [shadowAppId, onCleanup]);

  // Don't render children when not visible — React stays mounted but idle
  if (!shouldBeVisible) {
    return null;
  }

  return children;
};
