import { apiEndpoints } from './endpoints.js';
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

const config = getConfig();

class HttpService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use the API URL from config, not the web app URL
    this.baseUrl = baseUrl || config.apiURL || '';
  }

  private async request<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Use getWithFallback to check both stored token and bearer token from web app
      const authToken = config?.authToken || (await authStorage.getWithFallback()) || '';
      const headers = new Headers(config?.headers || {});
      const finalBaseUrl = config?.baseUrl || this.baseUrl;

      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }

      headers.set('Content-Type', 'application/json');

      const response = await fetch(`${finalBaseUrl}${url}`, {
        ...config,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        const requestStatus = response.status;

        if (requestStatus === 401 || requestStatus === 403) {
          // Clear stored auth token on unauthorized responses
          await authStorage.set('');
          throw new ApiUnauthorizedError(
            errorData.message || 'Unauthorized: Please log in again',
            requestStatus as 401 | 403,
          );
        }

        throw new Error(errorData.message || 'An unexpected error occurred');
      }

      if (config?.isStream) {
        // For stream responses, we return the ReadableStream body
        // The caller is responsible for handling the stream correctly
        return response.body as T;
      }

      const jsonResponse = await response.json();

      // Validate response with schema if provided - throw on validation failure
      if (config?.schema) {
        const result = config.schema.safeParse(jsonResponse);
        if (!result.success) {
          throw new ApiValidationError('API response validation failed', result.error.errors);
        }
        return result.data as T;
      }

      return jsonResponse as T;
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
    const message = {
      type: 'API_REQUEST',
      url: `${config?.baseUrl || this.baseUrl}${url}`,
      options: {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${config?.authToken}`,
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
          resolve(response.data);
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
  ApiDefaultErrorSchema,
  ApiErrorDetailsSchema,
  ApiErrorResponseSchema,
  CustomFetchConfigPropsSchema,
};
