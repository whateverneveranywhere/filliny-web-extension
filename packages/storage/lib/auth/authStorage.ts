import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import { z } from 'zod';
import type { BaseStorageType } from '../base/types.js';

// ============================================================================
// Auth Token Schema
// ============================================================================

/**
 * Type for auth token (non-empty string)
 */
type AuthTokenType = string;

/**
 * Schema for background script response
 */
const BackgroundTokenResponseSchema = z.object({
  success: z
    .object({
      token: z.string().nullable().optional(),
    })
    .optional(),
});

/**
 * Schema for storage result with bearer_token
 */
const BearerTokenStorageResultSchema = z.object({
  bearer_token: z.string().optional(),
});

type AuthStorage = BaseStorageType<AuthTokenType> & {
  setToken: (token: AuthTokenType) => Promise<void>;
  deleteToken: () => Promise<void>;
  /**
   * Get auth token following Better Auth's official pattern:
   * 1. First try bearer token from storage (from webapp via SET_BEARER_TOKEN)
   * 2. Fall back to session cookie (for compatibility)
   * @see https://www.better-auth.com/docs/plugins/bearer
   */
  getWithFallback: () => Promise<AuthTokenType>;
};

const storage = createStorage<AuthTokenType>('auth-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

/** Timeout for cookie token retrieval (2 seconds) */
const COOKIE_TOKEN_TIMEOUT_MS = 2000;

// NOTE: Tokens stored in bearer_token should already be raw session tokens
// (the part before the dot in a signed cookie). The bearer plugin accepts
// raw tokens and signs them server-side (Path A), which is the most reliable
// approach — it avoids encoding/verification mismatches between the cookie
// signing path (standard base64 via btoa) and bearer verification
// (base64urlnopad via @better-auth/utils).

/**
 * Get session token from cookie via background script
 * The cookie is set by Better Auth on the FRONTEND domain (not the API domain)
 * Has a timeout to prevent hanging if background script doesn't respond
 */
const getTokenFromCookie = (): Promise<string> =>
  new Promise(resolve => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.log('[Auth Storage] Chrome API not available');
      resolve('');
      return;
    }

    // Set up timeout to prevent hanging
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[Auth Storage] Cookie token request timed out after', COOKIE_TOKEN_TIMEOUT_MS, 'ms');
        resolve('');
      }
    }, COOKIE_TOKEN_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' }, response => {
        if (resolved) return; // Already timed out
        resolved = true;
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          console.error('[Auth Storage] Error getting token from cookie:', chrome.runtime.lastError);
          resolve('');
          return;
        }

        // Validate response format using Zod schema
        const parseResult = BackgroundTokenResponseSchema.safeParse(response);
        if (!parseResult.success) {
          console.error('[Auth Storage] Invalid response format from background script:', response);
          resolve('');
          return;
        }

        const token = parseResult.data.success?.token ?? '';
        // URL-decoding is handled centrally in getWithFallback()
        if (token) {
          console.log('[Auth Storage] Got token from cookie:', `${token.substring(0, 20)}...`);
        } else {
          console.warn('[Auth Storage] No token found in cookie');
        }
        resolve(token);
      });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.error('[Auth Storage] Failed to send message to background:', error);
        resolve('');
      }
    }
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
        console.error('[Auth Storage] Error getting bearer token from storage:', chrome.runtime.lastError);
        resolve('');
        return;
      }

      // Validate storage result using Zod schema
      const parseResult = BearerTokenStorageResultSchema.safeParse(result);
      if (!parseResult.success) {
        console.error('[Auth Storage] Invalid storage result format:', result);
        resolve('');
        return;
      }

      // URL-decoding is handled centrally in getWithFallback()
      const token = parseResult.data.bearer_token ?? '';
      if (token) {
        console.log('[Auth Storage] Got bearer token from storage:', `${token.substring(0, 20)}...`);
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
   * Get auth token following Better Auth's official pattern.
   * Prioritizes bearer token (from webapp via SET_BEARER_TOKEN) as per Better Auth docs.
   * Falls back to session cookie for compatibility with existing cookie-based flows.
   * Returns the raw session token (the bearer plugin signs it server-side).
   * @see https://www.better-auth.com/docs/plugins/bearer
   */
  getWithFallback: async () => {
    // Per Better Auth docs: bearer token is the recommended approach for extensions.
    // The raw session token is stored by the background script (already extracted
    // from signed cookies via extractRawToken in handleGetAuthToken/SET_BEARER_TOKEN).
    const bearerToken = await getBearerTokenFromStorage();
    if (bearerToken) {
      console.log('[Auth Storage] Using bearer token from storage');
      return bearerToken;
    }

    // Fallback to session cookie via background script.
    // handleGetAuthToken already extracts the raw token from the cookie.
    const cookieToken = await getTokenFromCookie();
    if (cookieToken) {
      console.log('[Auth Storage] Using session cookie token');
      return cookieToken;
    }

    console.log('[Auth Storage] No token found from bearer storage or cookie');
    return '';
  },
};
