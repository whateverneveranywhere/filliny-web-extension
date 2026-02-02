/**
 * Chrome Extension API abstraction layer
 * Provides a consistent interface for Chrome extension APIs
 */

/**
 * Chrome storage abstraction with type-safe get/set operations
 */
export const chromeStorage = {
  /**
   * Get a value from local storage
   * @param key - The key to retrieve
   * @returns Promise resolving to the stored value or undefined
   */
  get: <T>(key: string): Promise<T | undefined> =>
    new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve(undefined);
        return;
      }
      chrome.storage.local.get(key, result => {
        resolve(result[key] as T | undefined);
      });
    }),

  /**
   * Set a value in local storage
   * @param key - The key to set
   * @param value - The value to store
   * @returns Promise resolving when complete
   */
  set: <T>(key: string, value: T): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API not available'));
        return;
      }
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    }),

  /**
   * Remove a value from local storage
   * @param key - The key to remove
   * @returns Promise resolving when complete
   */
  remove: (key: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API not available'));
        return;
      }
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    }),
};

/**
 * Chrome tabs abstraction
 */
export const chromeTabs = {
  /**
   * Query for active tab in current window
   * @returns Promise resolving to the active tab URL or empty string
   */
  getActiveTabUrl: (): Promise<string> =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        resolve('');
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        const activeTab = tabs[0];
        if (activeTab) {
          resolve(activeTab.url || '');
        } else {
          reject(new Error('No active tab found'));
        }
      });
    }),

  /**
   * Send a message to a specific tab
   * @param tabId - The tab ID to send the message to
   * @param message - The message to send
   * @returns Promise resolving to the response
   */
  sendMessage: <T, R>(tabId: number, message: T): Promise<R> =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        reject(new Error('Chrome tabs API not available'));
        return;
      }
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as R);
        }
      });
    }),
};

/**
 * Chrome runtime abstraction
 */
export const chromeRuntime = {
  /**
   * Send a message to the extension (background script)
   * @param message - The message to send
   * @returns Promise resolving to the response
   */
  sendMessage: <T, R>(message: T): Promise<R> =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        reject(new Error('Chrome runtime API not available'));
        return;
      }
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as R);
        }
      });
    }),

  /**
   * Add a message listener
   * @param callback - The callback to handle messages
   * @returns Cleanup function to remove the listener
   */
  onMessage: <T>(callback: (message: T, sender: chrome.runtime.MessageSender) => void): (() => void) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return () => {};
    }
    const handler = (message: T, sender: chrome.runtime.MessageSender) => {
      callback(message, sender);
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  },
};

/**
 * Chrome cookies abstraction
 */
export const chromeCookies = {
  /**
   * Get a cookie by name and URL
   * @param url - The URL to get cookie for
   * @param name - The cookie name
   * @returns Promise resolving to the cookie value or null
   */
  get: (url: string, name: string): Promise<string | null> =>
    new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.cookies) {
        resolve(null);
        return;
      }
      chrome.cookies.get({ url, name }, cookie => {
        resolve(cookie?.value ?? null);
      });
    }),
};

/**
 * Check if Chrome extension APIs are available
 */
export const isChromeExtensionContext = (): boolean =>
  typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;
