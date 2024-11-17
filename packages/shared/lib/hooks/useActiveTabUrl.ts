import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentVistingUrl, isValidUrl } from '../utils';
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

export const useActiveTabUrl = ({ websites }: UseActiveTabUrlProps = {}): UseActiveTabUrlReturn => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const visitingUrl = await getCurrentVistingUrl();
      setUrl(isValidUrl(visitingUrl) ? visitingUrl : '');
    } catch (error) {
      console.error('Error fetching URL:', error);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const matchingWebsite = useMemo(() => {
    if (!websites || !isValidUrl(url)) {
      return null;
    }

    const currentUrlObj = new URL(url);

    return (
      websites.find(({ websiteUrl, isRootLoad }) => {
        if (!isValidUrl(websiteUrl)) {
          return false;
        }

        const websiteUrlObj = new URL(websiteUrl);

        if (isRootLoad) {
          return websiteUrlObj.hostname === currentUrlObj.hostname;
        } else {
          return websiteUrlObj.origin === currentUrlObj.origin && websiteUrlObj.pathname === currentUrlObj.pathname;
        }
      }) || null
    );
  }, [url, websites]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  useEffect(() => {
    const tabListeners = getTabListeners();
    const handleTabUpdate = () => updateUrl();

    tabListeners.onActivated(handleTabUpdate);
    tabListeners.onUpdated(handleTabUpdate);

    return () => {
      tabListeners.removeActivated(handleTabUpdate);
      tabListeners.removeUpdated(handleTabUpdate);
    };
  }, [updateUrl]);

  return {
    url,
    isLoading,
    isValid: isValidUrl(url),
    matchingWebsite,
  };
};
