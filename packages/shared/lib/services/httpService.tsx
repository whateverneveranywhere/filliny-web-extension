import { authStorage } from '@extension/storage';
import { apiEndpoints } from './endpoints';
import { getConfig } from '../utils';

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

const config = getConfig();

class HttpService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || `${config.baseURL}${apiEndpoints.version}` || '';
  }

  private async request<T>(url: string, config?: CustomFetchConfig): Promise<T> {
    const authToken = await authStorage.get();

    const token = config?.authToken || authToken || '';
    const headers = new Headers(config?.headers || {});
    const finalBaseUrl = config?.baseUrl || this.baseUrl;

    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }

    headers.append('Content-Type', 'application/json');

    const response = await fetch(`${finalBaseUrl}${url}`, {
      ...config,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const requestStatus = response.status;

      if (requestStatus === 403 || requestStatus === 401) {
        console.log('unauthorized');
      }

      throw new Error(errorData.message || 'Unknown error');
    }

    if (config?.isStream) {
      // Return a ReadableStream if the response is streamable
      return response.body as unknown as T;
    }

    // Return the JSON response if not streamable
    const jsonResponse: T = await response.json();
    return jsonResponse;
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
}

const httpService = new HttpService();

export { httpService };
