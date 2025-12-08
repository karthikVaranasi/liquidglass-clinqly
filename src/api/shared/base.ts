import { AuthStorage } from "../auth"

const API_BASE_URL = 'https://staging-api.clinqly.ai'

export class BaseAPI {
  protected static getAuthHeaders(): HeadersInit {
    const token = AuthStorage.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  protected static getBaseUrl(): string {
    return API_BASE_URL
  }

  protected static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }

  protected static buildQueryString(params: Record<string, any>): string {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })
    return queryParams.toString()
  }
}

