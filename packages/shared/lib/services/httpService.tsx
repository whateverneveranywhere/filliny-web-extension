import { apiEndpoints } from './endpoints.js';
import { MessageType } from '../types/enums.js';
import { getConfig } from '../utils/index.js';
import { authStorage } from '@extension/storage';
import type { z } from 'zod';

interface ApiDefaultError {
  message: string;
}

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

interface CustomFetchConfig<TSchema extends z.ZodType = z.ZodType> extends RequestInit {
  hasToast?: boolean;
  endpoint?: string;
  baseUrl?: string;
  authToken?: string;
  isStream?: boolean;
  /** Optional Zod schema for response validation */
  schema?: TSchema;
  /** Request timeout in milliseconds (defaults to 30 seconds) */
  timeout?: number;
}

interface ApiErrorDetails {
  field?: string;
  reason?: string;
  [key: string]: string | undefined;
}

interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: ApiErrorDetails;
}

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
    this.baseUrl = baseUrl || `${config.baseURL}${apiEndpoints.version}` || '';
  }

  private async request<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const authToken = config?.authToken || (await authStorage.get()) || '';
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

  async post<T, D = Record<string, unknown>>(url: string, data?: D, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async put<T, D = Record<string, unknown>>(url: string, data?: D, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async patch<T, D = Record<string, unknown>>(url: string, data?: D, config?: CustomFetchConfig): Promise<T> {
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

export type { ApiDefaultError };
export { httpService, ApiValidationError, ApiUnauthorizedError, ApiTimeoutError };
