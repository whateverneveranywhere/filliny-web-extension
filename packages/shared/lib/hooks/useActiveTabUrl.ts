import { useEffect, useState, useCallback, useMemo } from "react";
import { getCurrentVistingUrl, getMatchingWebsite, isValidUrl } from "../utils/index.js";
import type { DTOProfileFillingForm } from "@extension/storage";

interface UseActiveTabUrlReturn {
  activeTabUrl: string;
  isLoading: boolean;
  isValid: boolean;
  matchingWebsite: DTOProfileFillingForm["fillingWebsites"][0] | null;
  currentPageUrl: string;
}

interface UseActiveTabUrlProps {
  websites?: DTOProfileFillingForm["fillingWebsites"];
  mode?: "activeTab" | "currentPage" | "both";
}

interface TabUpdateListeners {
  onActivated: (callback: () => void) => void;
  onUpdated: (callback: () => void) => void;
  removeActivated: (callback: () => void) => void;
  removeUpdated: (callback: () => void) => void;
}

const getTabListeners = (): TabUpdateListeners => {
  const isChromeAvailable = typeof chrome !== "undefined" && chrome.tabs;

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
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return "";
  }
  return getCurrentVistingUrl();
};

const getCurrentPageUrl = () => window.location?.href || "";

export const useActiveTabUrl = ({ websites, mode = "both" }: UseActiveTabUrlProps = {}): UseActiveTabUrlReturn => {
  const [activeTabUrl, setActiveTabUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const currentPageUrl = getCurrentPageUrl();

  const updateUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const tabUrl = await getCurrentTabUrl();
      setActiveTabUrl(tabUrl || "");
    } catch (error) {
      console.error("Error fetching URL:", error);
      setActiveTabUrl("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const matchingWebsite = useMemo(() => {
    if (!websites) return null;

    if (mode === "currentPage") {
      return getMatchingWebsite(websites, currentPageUrl);
    }

    if (mode === "activeTab") {
      return getMatchingWebsite(websites, activeTabUrl);
    }

    return getMatchingWebsite(websites, currentPageUrl) || getMatchingWebsite(websites, activeTabUrl);
  }, [websites, mode, activeTabUrl, currentPageUrl]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  useEffect(() => {
    if (mode !== "currentPage") {
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
    isValid: mode === "currentPage" ? isValidUrl(currentPageUrl) : isValidUrl(activeTabUrl),
    matchingWebsite,
  };
};
