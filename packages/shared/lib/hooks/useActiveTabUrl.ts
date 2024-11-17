import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentVistingUrl, getMatchingWebsite, isValidUrl } from '../utils';
import type { DTOProfileFillingForm } from '@extension/storage';

interface UseActiveTabUrlReturn {
  url: string;
  isLoading: boolean;
  isValid: boolean;
  matchingWebsite: DTOProfileFillingForm['fillingWebsites'][0] | null;
}

interface UseActiveTabUrlProps {
  websites?: DTOProfileFillingForm['fillingWebsites'];
}

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

const getCurrentUrl = async (useCurrentUrl: boolean): Promise<string> => {
  if (useCurrentUrl && window.location?.href) {
    return window.location.href;
  }
  return getCurrentVistingUrl();
};

export const useActiveTabUrl = ({ websites }: UseActiveTabUrlProps = {}): UseActiveTabUrlReturn => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const visitingUrl = await getCurrentUrl(!!websites);
      setUrl(visitingUrl || '');
    } catch (error) {
      console.error('Error fetching URL:', error);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [websites]);

  const matchingWebsite = useMemo(() => {
    if (!websites || !url) return null;
    return getMatchingWebsite(websites, url);
  }, [url, websites]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  useEffect(() => {
    if (!websites) {
      const tabListeners = getTabListeners();
      const handleTabUpdate = () => updateUrl();

      tabListeners.onActivated(handleTabUpdate);
      tabListeners.onUpdated(handleTabUpdate);

      return () => {
        tabListeners.removeActivated(handleTabUpdate);
        tabListeners.removeUpdated(handleTabUpdate);
      };
    }
  }, [updateUrl, websites]);

  return {
    url,
    isLoading,
    isValid: isValidUrl(url),
    matchingWebsite,
  };
};
