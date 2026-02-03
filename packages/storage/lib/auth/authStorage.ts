import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorageType } from '../base/types.js';

type AuthTokenType = string;

type AuthStorage = BaseStorageType<AuthTokenType> & {
  setToken: (token: AuthTokenType) => Promise<void>;
  deleteToken: () => Promise<void>;
  /** Get token with fallback to bearer token from web app */
  getWithFallback: () => Promise<AuthTokenType>;
};

const storage = createStorage<AuthTokenType>('auth-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

/**
 * Get bearer token from chrome storage (set by web app via message passing)
 */
const getBearerToken = (): Promise<string> =>
  new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve('');
      return;
    }
    chrome.storage.local.get('bearer_token', result => {
      resolve(result.bearer_token || '');
    });
  });

export const authStorage: AuthStorage = {
  ...storage,
  setToken: async (token: AuthTokenType) => await storage.set(token),
  deleteToken: async () => {
    await storage.set('');
    // Also clear bearer token
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('bearer_token');
    }
  },
  /**
   * Get token with fallback to bearer token
   * Priority: 1. Stored auth token  2. Bearer token from web app
   */
  getWithFallback: async () => {
    const storedToken = await storage.get();
    if (storedToken) {
      return storedToken;
    }
    // Fallback to bearer token from web app
    return getBearerToken();
  },
};
