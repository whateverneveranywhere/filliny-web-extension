import { isValidUrl } from '../services/schemas/index.js';
import { getCurrentVistingUrl, getMatchingWebsite } from '../utils/index.js';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { DTOProfileFillingForm } from '@extension/storage';

// ============================================================================
// Hook Schemas
// ============================================================================

/**
 * Schema for active tab URL mode
 */
const ActiveTabUrlModeSchema = z.enum(['activeTab', 'currentPage', 'both']);
type _ActiveTabUrlMode = z.infer<typeof ActiveTabUrlModeSchema>;

/**
 * Schema for useActiveTabUrl hook props
 * Note: websites uses the imported type from storage as it references the full schema
 */
const _UseActiveTabUrlPropsSchema = z.object({
  websites: z.custom<DTOProfileFillingForm['fillingWebsites']>().optional(),
  mode: ActiveTabUrlModeSchema.optional(),
});
type UseActiveTabUrlProps = z.infer<typeof _UseActiveTabUrlPropsSchema>;

/**
 * Schema for useActiveTabUrl hook return value
 * Note: matchingWebsite references the external type from storage
 */
const _UseActiveTabUrlReturnSchema = z.object({
  activeTabUrl: z.string(),
  isLoading: z.boolean(),
  isValid: z.boolean(),
  matchingWebsite: z.custom<DTOProfileFillingForm['fillingWebsites'][0] | null>(),
  currentPageUrl: z.string(),
});
type UseActiveTabUrlReturn = z.infer<typeof _UseActiveTabUrlReturnSchema>;

/**
 * TabUpdateListeners interface - uses function types which cannot be expressed in Zod
 * This is acceptable per type-inference-patterns.md for function-heavy interfaces
 */
interface TabUpdateListeners {
  onActivated: (callback: () => void) => void;
  onUpdated: (callback: () => void) => void;
  removeActivated: (callback: () => void) => void;
  removeUpdated: (callback: () => void) => void;
}

const getTabListeners = (): TabUpdateListeners => {
  const isChromeAvailable = typeof chrome !== 'undefined' && chrome.tabs;

  return {
    onActivated: callback => {
      if (isChromeAvailable) {
        chrome.tabs.onActivated.addListener(callback);
      }
    },
    onUpdated: callback => {
      if (isChromeAvailable) {
        chrome.tabs.onUpdated.addListener(callback);
      }
    },
    removeActivated: callback => {
      if (isChromeAvailable) {
        chrome.tabs.onActivated.removeListener(callback);
      }
    },
    removeUpdated: callback => {
      if (isChromeAvailable) {
        chrome.tabs.onUpdated.removeListener(callback);
      }
    },
  };
};

const getCurrentTabUrl = async (): Promise<string> => {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return '';
  }
  return getCurrentVistingUrl();
};

const getCurrentPageUrl = () => window.location?.href || '';

export const useActiveTabUrl = ({ websites, mode = 'both' }: UseActiveTabUrlProps = {}): UseActiveTabUrlReturn => {
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const currentPageUrl = getCurrentPageUrl();

  const updateUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const tabUrl = await getCurrentTabUrl();
      setActiveTabUrl(tabUrl || '');
    } catch (error) {
      console.error('Error fetching URL:', error);
      setActiveTabUrl('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const matchingWebsite = useMemo(() => {
    if (!websites) return null;

    if (mode === 'currentPage') {
      return getMatchingWebsite(websites, currentPageUrl);
    }

    if (mode === 'activeTab') {
      return getMatchingWebsite(websites, activeTabUrl);
    }

    return getMatchingWebsite(websites, currentPageUrl) || getMatchingWebsite(websites, activeTabUrl);
  }, [websites, mode, activeTabUrl, currentPageUrl]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  useEffect(() => {
    if (mode !== 'currentPage') {
      const tabListeners = getTabListeners();

      // Don't debounce - we want immediate URL detection
      const handleTabUpdate = () => updateUrl();

      tabListeners.onActivated(handleTabUpdate);
      tabListeners.onUpdated(handleTabUpdate);

      return () => {
        tabListeners.removeActivated(handleTabUpdate);
        tabListeners.removeUpdated(handleTabUpdate);
      };
    }
    return () => {};
  }, [updateUrl, mode]);

  return {
    activeTabUrl,
    currentPageUrl,
    isLoading,
    isValid: mode === 'currentPage' ? isValidUrl(currentPageUrl) : isValidUrl(activeTabUrl),
    matchingWebsite,
  };
};
