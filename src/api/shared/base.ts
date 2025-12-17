import axios, { type AxiosRequestConfig } from 'axios'
import { createFriendlyError, type ErrorContext } from "../../lib/errors"
import { http } from "./http"

type RequestConfig = AxiosRequestConfig & { skipAuthRefresh?: boolean }

export class BaseAPI {
  protected static client = http

  protected static getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL
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

  protected static async request<T>(config: RequestConfig, context: ErrorContext = 'data'): Promise<T> {
    try {
      const response = await this.client.request<T>(config)
      return response.data
    } catch (error) {
      throw this.normalizeError(error, context)
    }
  }

  protected static get<T>(url: string, context: ErrorContext = 'data', config?: RequestConfig): Promise<T> {
    return this.request<T>({ url, method: 'GET', ...config }, context)
  }

  protected static post<T>(url: string, data?: any, context: ErrorContext = 'data', config?: RequestConfig): Promise<T> {
    return this.request<T>({ url, method: 'POST', data, ...config }, context)
  }

  protected static put<T>(url: string, data?: any, context: ErrorContext = 'data', config?: RequestConfig): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data, ...config }, context)
  }

  protected static patch<T>(url: string, data?: any, context: ErrorContext = 'data', config?: RequestConfig): Promise<T> {
    return this.request<T>({ url, method: 'PATCH', data, ...config }, context)
  }

  protected static delete<T>(url: string, context: ErrorContext = 'data', config?: RequestConfig): Promise<T> {
    return this.request<T>({ url, method: 'DELETE', ...config }, context)
  }

  private static normalizeError(error: unknown, context: ErrorContext): Error {
    if ((error as any)?.statusCode) {
      return error as Error
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500
      const serverMessage = this.extractMessage(error.response?.data)
      return createFriendlyError(status, serverMessage, context)
    }

    if (error instanceof Error) {
      return error
    }

    return createFriendlyError(500, undefined, context)
  }

  private static extractMessage(data: any): string | undefined {
    if (!data) return undefined
    if (typeof data === 'string') return data
    if (typeof data.message === 'string') return data.message
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && typeof data.detail[0]?.msg === 'string') return data.detail[0].msg
    return undefined
  }
}

