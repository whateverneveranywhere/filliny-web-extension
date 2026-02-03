import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorageType } from '../base/types.js';

type AuthTokenType = string;

type AuthStorage = BaseStorageType<AuthTokenType> & {
  setToken: (token: AuthTokenType) => Promise<void>;
  deleteToken: () => Promise<void>;
  /** Get token - reads from session cookie via background script */
  getWithFallback: () => Promise<AuthTokenType>;
};

const storage = createStorage<AuthTokenType>('auth-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

/**
 * Get session token from cookie via background script
 * The cookie is set by Better Auth on the API domain
 */
const getTokenFromCookie = (): Promise<string> =>
  new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.log('[Auth Storage] Chrome API not available');
      resolve('');
      return;
    }
    chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' }, response => {
      if (chrome.runtime.lastError) {
        console.error('[Auth Storage] Error getting token from cookie:', chrome.runtime.lastError);
        resolve('');
        return;
      }

      // Validate response format: { success: { token: string | null } }
      if (!response || typeof response !== 'object') {
        console.error('[Auth Storage] Invalid response format from background script:', response);
        resolve('');
        return;
      }

      if (!response.success || typeof response.success !== 'object') {
        console.error('[Auth Storage] Missing success field in response:', response);
        resolve('');
        return;
      }

      const token = response.success.token || '';
      if (token) {
        console.log('[Auth Storage] Got token from cookie:', `${token.substring(0, 20)}...`);
      } else {
        console.warn('[Auth Storage] No token found in cookie');
      }
      resolve(token);
    });
  });

/**
 * Get bearer token from extension storage (fallback)
 * This token is set by the web app via SET_BEARER_TOKEN message
 */
const getBearerTokenFromStorage = (): Promise<string> =>
  new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.log('[Auth Storage] Chrome storage not available');
      resolve('');
      return;
    }
    chrome.storage.local.get('bearer_token', result => {
      if (chrome.runtime.lastError) {
        console.error(
          '[Auth Storage] Error getting bearer token from storage:',
          chrome.runtime.lastError,
        );
        resolve('');
        return;
      }

      if (!result || typeof result !== 'object') {
        console.error('[Auth Storage] Invalid storage result format:', result);
        resolve('');
        return;
      }

      const token = result.bearer_token || '';
      if (token) {
        console.log(
          '[Auth Storage] Got bearer token from storage:',
          `${token.substring(0, 20)}...`,
        );
      } else {
        console.warn('[Auth Storage] No bearer token found in storage');
      }
      resolve(token);
    });
  });

export const authStorage: AuthStorage = {
  ...storage,
  setToken: async (token: AuthTokenType) => await storage.set(token),
  deleteToken: async () => {
    await storage.set('');
  },
  /**
   * Get token - reads from session cookie via background script
   * Falls back to bearer token from storage if cookie token is empty
   */
  getWithFallback: async () => {
    // Try cookie first (Better Auth session token)
    const cookieToken = await getTokenFromCookie();
    if (cookieToken) {
      return cookieToken;
    }

    // Fallback to bearer token from storage (set by web app)
    const bearerToken = await getBearerTokenFromStorage();
    if (bearerToken) {
      console.log('[Auth Storage] Using bearer token from storage as fallback');
      return bearerToken;
    }

    console.log('[Auth Storage] No token found from cookie or storage');
    return '';
  },
};
