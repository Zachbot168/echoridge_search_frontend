import { getDBConfig } from '@/lib/db/engine';

interface RequestOptions extends RequestInit {
  etag?: string;
  retries?: number;
  retryDelay?: number;
}

interface APIResponse<T> {
  data: T;
  etag?: string;
  cursor?: string;
}

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Retry logic for failed requests
async function retryRequest<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 429)
      if (error instanceof APIError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < retries - 1) {
        const waitTime = delay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// Main API client
export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor() {
    const config = getDBConfig();
    this.baseUrl = config.apiBaseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-Mode': config.tenantMode,
      'X-Audience-Scope': config.audienceScope,
    };
  }
  
  // Generic request method with ETag support
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const { etag, retries = 3, retryDelay = 1000, ...fetchOptions } = options;
    
    // Build headers
    const headers = new Headers({
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    });
    
    // Add ETag if provided
    if (etag) {
      headers.set('If-None-Match', etag);
    }
    
    // Build full URL
    const url = `${this.baseUrl}${endpoint}`;
    
    // Make request with retry logic
    const response = await retryRequest(
      async () => {
        const res = await fetch(url, {
          ...fetchOptions,
          headers,
        });
        
        // Handle 304 Not Modified
        if (res.status === 304) {
          return {
            data: null as any,
            etag: res.headers.get('ETag') || undefined,
            notModified: true,
          };
        }
        
        // Handle errors
        if (!res.ok) {
          const errorBody = await res.text();
          let errorData;
          try {
            errorData = JSON.parse(errorBody);
          } catch {
            errorData = errorBody;
          }
          
          throw new APIError(
            `API request failed: ${res.statusText}`,
            res.status,
            res.statusText,
            errorData
          );
        }
        
        // Parse response
        const data = await res.json();
        
        return {
          data,
          etag: res.headers.get('ETag') || undefined,
          cursor: res.headers.get('X-Next-Cursor') || data.next_cursor || undefined,
        };
      },
      retries,
      retryDelay
    );
    
    return response;
  }
  
  // GET request helper
  async get<T>(endpoint: string, options?: RequestOptions): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }
  
  // POST request helper
  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  // Build query string from params
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays (e.g., filters)
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }
  
  // Paginate through all results using cursor
  async *paginate<T>(
    endpoint: string,
    options?: RequestOptions
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    let etag: string | undefined = options?.etag;
    
    do {
      // Build URL with cursor
      const url = cursor ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}cursor=${cursor}` : endpoint;
      
      // Make request
      const response = await this.get<{ items: T[]; next_cursor?: string }>(url, {
        ...options,
        etag,
      });
      
      // Yield items
      if (response.data && response.data.items) {
        yield response.data.items;
      }
      
      // Update cursor and etag for next iteration
      cursor = response.cursor || response.data?.next_cursor;
      etag = response.etag;
      
    } while (cursor);
  }
}

// Singleton instance
let apiClient: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!apiClient) {
    apiClient = new APIClient();
  }
  return apiClient;
}

// Utility function to handle API errors
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

// Utility to check if response is not modified
export function isNotModified<T>(response: APIResponse<T>): boolean {
  return (response as any).notModified === true;
}