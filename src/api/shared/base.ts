import { AuthStorage } from "../auth"
import { createFriendlyError } from "../../lib/errors"

export class BaseAPI {
  protected static getAuthHeaders(): HeadersInit {
    const token = AuthStorage.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  protected static getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL
  }

  protected static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: undefined }))
      throw createFriendlyError(response.status, errorData.message, 'data')
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

