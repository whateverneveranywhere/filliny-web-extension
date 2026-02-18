import {
  unwrapApiEnvelope,
  parseApiError,
  detectQuotaErrorFromResponse,
  detectQuotaErrorFromMessage,
} from './schemas/index.js';
import { getConfig } from '../utils/index.js';
import { authStorage } from '@extension/storage';
import { z } from 'zod';

// ============================================================================
// Zod Schemas for HTTP Service Types
// ============================================================================

/**
 * Schema for default API error response
 */
const ApiDefaultErrorSchema = z.object({
  message: z.string(),
});

/**
 * Schema for detailed API error information
 */
const ApiErrorDetailsSchema = z.record(z.string(), z.string().optional());

/**
 * Schema for API error response
 */
const ApiErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: ApiErrorDetailsSchema.optional(),
});

/**
 * Schema for custom fetch configuration
 * Note: Extends RequestInit which is a browser API type, so we define
 * the Zod-inferable properties separately
 */
const CustomFetchConfigPropsSchema = z.object({
  hasToast: z.boolean().optional(),
  endpoint: z.string().optional(),
  baseUrl: z.string().optional(),
  authToken: z.string().optional(),
  isStream: z.boolean().optional(),
  /** Request timeout in milliseconds (defaults to 30 seconds) */
  timeout: z.number().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

type ApiDefaultError = z.infer<typeof ApiDefaultErrorSchema>;
type ApiErrorDetails = z.infer<typeof ApiErrorDetailsSchema>;
type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Custom fetch configuration extending RequestInit with additional properties
 * Note: The schema property uses generic Zod type which cannot be expressed in Zod itself,
 * so we define the interface extending the inferred type
 */
interface CustomFetchConfig<TSchema extends z.ZodType = z.ZodType>
  extends RequestInit,
    z.infer<typeof CustomFetchConfigPropsSchema> {
  /** Optional Zod schema for response validation */
  schema?: TSchema;
}

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

class ApiValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError['errors'],
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

class ApiUnauthorizedError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403,
  ) {
    super(message);
    this.name = 'ApiUnauthorizedError';
  }
}

class ApiTimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

/**
 * Error type for quota/limit exceeded responses (403 Forbidden)
 * Used when user has no tokens or free forms remaining
 */
class ApiQuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly errorType: 'no_tokens' | 'no_free_forms' | 'limit_exceeded',
  ) {
    super(message);
    this.name = 'ApiQuotaExceededError';
  }

  /**
   * Check if user should be prompted to subscribe
   */
  get shouldPromptSubscription(): boolean {
    return this.errorType === 'no_tokens' || this.errorType === 'no_free_forms';
  }
}

/**
 * Detect quota error type from error message
 * @deprecated Use detectQuotaErrorFromMessage from schemas instead
 */
const detectQuotaErrorType = detectQuotaErrorFromMessage;

const appConfig = getConfig();

class HttpService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    // Use the API URL from config which already includes /api/v1
    this.apiUrl = apiUrl || appConfig.apiURL || '';
  }

  private async request<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Get auth token - prioritizes bearer token, falls back to session cookie
      const authToken = config?.authToken || (await authStorage.getWithFallback()) || '';
      const headers = new Headers(config?.headers || {});
      const finalApiUrl = config?.baseUrl || this.apiUrl;

      console.log('[HTTP Service] Auth token:', authToken ? `${authToken.substring(0, 20)}...` : 'empty');

      // Use Authorization header for authentication
      // Note: Cookie header is forbidden in fetch, so we rely on Authorization
      // and credentials: 'include' for cookie-based auth
      if (authToken) {
        // Authorization header for Bearer plugin support
        headers.set('Authorization', `Bearer ${authToken}`);
        console.log('[HTTP Service] Auth header set (Bearer)');
      } else {
        console.log('[HTTP Service] No auth token - skipping auth headers');
      }

      headers.set('Content-Type', 'application/json');

      // apiUrl already includes /api/v1, so just append the endpoint path
      // Handle absolute URLs separately
      const fullUrl = url.startsWith('http') ? url : `${finalApiUrl}${url}`;

      console.log('[HTTP Service] Making request to:', fullUrl);
      console.log('[HTTP Service] Request method:', config?.method || 'GET');
      // Log headers for debugging - iterate manually since Headers.entries() may not be available in all TypeScript targets
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'authorization') {
          headerObj[key] = `${value.substring(0, 30)}...`;
        } else if (key.toLowerCase() === 'cookie') {
          // Mask cookie value for security
          headerObj[key] = value.replace(/=.+$/, '=<token>');
        } else {
          headerObj[key] = value;
        }
      });
      console.log('[HTTP Service] Headers:', headerObj);

      // Use credentials: 'include' to send cookies for same-origin requests
      // Combined with Authorization header for maximum compatibility
      const response = await fetch(fullUrl, {
        ...config,
        headers,
        signal: controller.signal,
        credentials: 'include',
      });

      console.log('[HTTP Service] Response status:', response.status);

      if (!response.ok) {
        const requestStatus = response.status;

        // Safely parse error response - it might not be JSON
        let errorMessage = 'An unexpected error occurred';
        let errorCode: string | undefined;
        try {
          const errorJson: unknown = await response.json();
          const structured = parseApiError(errorJson);
          if (structured) {
            errorMessage = structured.message;
            errorCode = structured.code;
          } else if (errorJson && typeof errorJson === 'object' && 'message' in errorJson) {
            errorMessage = (errorJson as { message: string }).message;
          }
        } catch {
          // If parsing fails, use response status text as message
          errorMessage = response.statusText || `HTTP ${requestStatus} error`;
        }

        if (requestStatus === 401) {
          // Clear stored auth token on unauthorized responses
          await authStorage.set('');

          // Notify the extension that auth is invalid (only in extension context)
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            try {
              chrome.runtime.sendMessage({
                action: 'AUTH_TOKEN_CHANGED',
                payload: { success: { token: null } },
              });
            } catch {
              // Ignore errors - this is best effort notification
            }
          }

          throw new ApiUnauthorizedError(errorMessage || 'Unauthorized: Please log in again', 401);
        }

        if (requestStatus === 403) {
          // Check if this is a quota/limit error using structured code + message fallback
          const quotaErrorType = detectQuotaErrorFromResponse({ code: errorCode, message: errorMessage });
          if (quotaErrorType) {
            throw new ApiQuotaExceededError(errorMessage || 'Quota exceeded', quotaErrorType);
          }
          // Otherwise treat as authorization error
          throw new ApiUnauthorizedError(errorMessage || 'Forbidden: Access denied', 403);
        }

        throw new Error(errorMessage || 'An unexpected error occurred');
      }

      if (config?.isStream) {
        // For stream responses, we return the ReadableStream body
        // The caller is responsible for handling the stream correctly
        return response.body as T;
      }

      const jsonResponse: unknown = await response.json();

      // Unwrap the API response envelope - the API wraps all responses in { data, meta, success }
      // Uses Zod schema-based parsing to extract 'data' if envelope matches
      const unwrappedData = unwrapApiEnvelope(jsonResponse);

      // Validate response with schema if provided - throw on validation failure
      if (config?.schema) {
        const result = config.schema.safeParse(unwrappedData);
        if (!result.success) {
          throw new ApiValidationError('API response validation failed', result.error.errors);
        }
        return result.data as T;
      }

      return unwrappedData as T;
    } catch (error) {
      if (error instanceof Error) {
        // Handle abort/timeout errors
        if (error.name === 'AbortError') {
          throw new ApiTimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
      }
      throw new Error('An unexpected error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, { method: 'GET', ...config });
  }

  async post<T, D extends object = Record<string, never>>(
    url: string,
    data?: D,
    config?: CustomFetchConfig,
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async put<T, D extends object = Record<string, never>>(
    url: string,
    data?: D,
    config?: CustomFetchConfig,
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async patch<T, D extends object = Record<string, never>>(
    url: string,
    data?: D,
    config?: CustomFetchConfig,
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async delete<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', ...config });
  }

  async requestViaBackground<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    // Get auth token - prioritizes bearer token, falls back to session cookie
    const authToken = config?.authToken || (await authStorage.getWithFallback()) || '';

    console.log('[HTTP Service Background] Auth token:', authToken ? `${authToken.substring(0, 20)}...` : 'empty');

    // Use Authorization header for authentication
    // Note: Cookie header is forbidden in service workers
    const authHeaders: Record<string, string> = {};
    if (authToken) {
      authHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const message = {
      type: 'API_REQUEST',
      url: `${config?.baseUrl || this.apiUrl}${url}`,
      options: {
        ...config,
        headers: {
          ...config?.headers,
          ...authHeaders,
          'Content-Type': 'application/json',
          'X-Extension-ID': chrome.runtime.id,
        },
      },
    };

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Unwrap the API response envelope (same as request() does)
          // Uses Zod schema-based parsing to extract 'data' if envelope matches
          const unwrapped = unwrapApiEnvelope(response.data);

          // Validate with schema if provided (same as request() does)
          if (config?.schema) {
            const result = config.schema.safeParse(unwrapped);
            if (!result.success) {
              reject(new ApiValidationError('API response validation failed', result.error.errors));
              return;
            }
            resolve(result.data as T);
          } else {
            resolve(unwrapped as T);
          }
        }
      });
    });
  }
}

const httpService = new HttpService();

// All exports at end of file to comply with import-x/exports-last
export type { ApiDefaultError, ApiErrorDetails, ApiErrorResponse, CustomFetchConfig };
export {
  httpService,
  ApiValidationError,
  ApiUnauthorizedError,
  ApiTimeoutError,
  ApiQuotaExceededError,
  detectQuotaErrorType,
  ApiDefaultErrorSchema,
  ApiErrorDetailsSchema,
  ApiErrorResponseSchema,
  CustomFetchConfigPropsSchema,
};
