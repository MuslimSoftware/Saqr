import { config } from '@/config/environment.config'
import { HttpMethod, ApiResponse } from '@/api/types/api.types'
import { getDemoToken } from '@/config/storage.config'

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseUrl = config.FE_API_URL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = { ...this.defaultHeaders }

    // Add demo auth token if available
    const demoToken = getDemoToken()
    if (demoToken) {
      headers['Authorization'] = `Bearer ${demoToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      })

      const text = await response.text()
      const data = text ? JSON.parse(text) : null

      if (!response.ok) {
        throw {
          message: data?.message || `Request failed with status ${response.status}`,
          error_code: data?.error_code || 'UNKNOWN_ERROR',
          status_code: response.status,
        }
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          error_code: 'NETWORK_ERROR',
          status_code: 500,
        }
      }
      throw error
    }
  }

  private async makeRequest<T>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const requestOptions: RequestInit = {
      ...options,
      method,
      ...(data && { body: JSON.stringify(data) }),
    }
    return this.request<T>(endpoint, requestOptions)
  }

  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(HttpMethod.GET, endpoint, undefined, options)
  }

  public async post<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(HttpMethod.POST, endpoint, data, options)
  }

  public async put<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(HttpMethod.PUT, endpoint, data, options)
  }

  public async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(HttpMethod.DELETE, endpoint, undefined, options)
  }

  public async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(HttpMethod.PATCH, endpoint, data, options)
  }
}

export const apiClient = new ApiClient() 