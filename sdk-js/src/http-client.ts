import { CVaultConfig } from './types';
import { CVaultError } from './error';

/**
 * HTTP Client for making API requests
 */
export class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private debug: boolean;
  private accessToken?: string;

  constructor(config: CVaultConfig) {
    this.baseUrl = config.baseUrl || 'https://api.cvault.io';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.debug = config.debug || false;
  }

  /**
   * Set access token (JWT) for authenticated requests
   */
  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, requiresAuth: boolean = false): Promise<T> {
    return this.request<T>('GET', path, undefined, requiresAuth);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: any, requiresAuth: boolean = false): Promise<T> {
    return this.request<T>('POST', path, data, requiresAuth);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, data?: any, requiresAuth: boolean = false): Promise<T> {
    return this.request<T>('PUT', path, data, requiresAuth);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, requiresAuth: boolean = false): Promise<T> {
    return this.request<T>('DELETE', path, undefined, requiresAuth);
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    // Add Authorization header if token is available and required
    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    if (this.debug) {
      console.log(`[CVault SDK] ${method} ${url}`, data);
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let body: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      if (this.debug) {
        console.log(`[CVault SDK] Response:`, response.status, body);
      }

      // Handle error responses
      if (!response.ok) {
        throw CVaultError.fromResponse(response.status, body);
      }

      return body as T;
    } catch (error: any) {
      if (error instanceof CVaultError) {
        throw error;
      }

      // Handle network errors
      if (error.name === 'AbortError') {
        throw CVaultError.networkError('Request timeout');
      }

      throw CVaultError.networkError(error.message || 'Network request failed');
    }
  }
}
