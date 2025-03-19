import { authStorage } from '@extension/storage';
import { apiEndpoints } from './endpoints.js';
import { getConfig } from '../utils/index.js';

export interface ApiDefaultError {
  message: string;
}

interface CustomFetchConfig extends RequestInit {
  hasToast?: boolean;
  endpoint?: string;
  baseUrl?: string;
  authToken?: string;
  isStream?: boolean;
}

interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

const config = getConfig();

class HttpService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || `${config.baseURL}${apiEndpoints.version}` || '';
  }

  private async request<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    try {
      const authToken = config?.authToken || (await authStorage.get()) || '';
      const headers = new Headers(config?.headers || {});
      const finalBaseUrl = config?.baseUrl || this.baseUrl;

      if (authToken) {
        headers.append('Authorization', `Bearer ${authToken}`);
      }

      headers.append('Content-Type', 'application/json');

      const response = await fetch(`${finalBaseUrl}${url}`, {
        ...config,
        headers,
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        const requestStatus = response.status;

        if (requestStatus === 403 || requestStatus === 401) {
          console.log('unauthorized');
        }

        throw new Error(errorData.message || 'An unexpected error occurred');
      }

      if (config?.isStream) {
        return response.body as unknown as T;
      }

      const jsonResponse: T = await response.json();
      return jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, { method: 'GET', ...config });
  }

  async post<T>(url: string, data?: unknown, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async put<T>(url: string, data?: unknown, config?: CustomFetchConfig): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...config,
    });
  }

  async patch<T>(url: string, data?: unknown, config?: CustomFetchConfig): Promise<T> {
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

export { httpService };
