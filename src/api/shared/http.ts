import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { createFriendlyError } from '../../lib/errors'

const baseURL = import.meta.env.VITE_API_BASE_URL

type TokenAccessors = {
  getToken: () => string | null
  setToken: (token: string | null) => void
}

let tokenAccessors: TokenAccessors = {
  getToken: () => null,
  setToken: () => {},
}

export const setHttpTokenAccessors = (accessors: TokenAccessors) => {
  tokenAccessors = accessors
}

// Primary axios client used across the app
export const http = axios.create({
  baseURL,
  withCredentials: true,
})

// Lightweight client without interceptors for refresh/logout
const authlessClient = axios.create({
  baseURL,
  withCredentials: true,
})

let refreshPromise: Promise<string | null> | null = null

const dispatchSessionExpired = () => {
  window.dispatchEvent(new CustomEvent('session-expired'))
}

const extractAccessToken = (data: any): string | null => {
  if (!data || typeof data !== 'object') return null
  return data.access_token || data.token || data.accessToken || null
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await authlessClient.post('/dashboard/auth/refresh')
      const newToken = extractAccessToken(response.data)
      if (newToken) {
        tokenAccessors.setToken(newToken)
        return newToken
      }
      return null
    })().catch(() => null).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export const logoutCleanup = async (): Promise<void> => {
  try {
    await authlessClient.post('/dashboard/auth/logout')
  } catch {
    // Ignore logout errors; proceed with cleanup
  } finally {
    tokenAccessors.setToken(null)
    dispatchSessionExpired()
  }
}

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenAccessors.getToken()
    if (token) {
      config.headers = config.headers || {}
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  }
)

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error
    const requestConfig = config as (InternalAxiosRequestConfig & { _retry?: boolean, skipAuthRefresh?: boolean }) | undefined

    const url = requestConfig?.url || ''
    const shouldSkipRefresh = requestConfig?.skipAuthRefresh || url.includes('/dashboard/auth/refresh') || url.includes('/dashboard/auth/logout')
    const hasToken = Boolean(tokenAccessors.getToken())

    if (response?.status === 401 && requestConfig && !requestConfig._retry && !shouldSkipRefresh && hasToken) {
      requestConfig._retry = true
      const newToken = await refreshAccessToken()

      if (newToken) {
        requestConfig.headers = requestConfig.headers || {}
        requestConfig.headers.Authorization = `Bearer ${newToken}`
        return http(requestConfig)
      }

      await logoutCleanup()
      const serverMessage = typeof (response.data as any)?.message === 'string' ? (response.data as any).message : undefined
      return Promise.reject(createFriendlyError(401, serverMessage, 'data'))
    }

    // For non-401 errors, let BaseAPI handle friendly formatting
    return Promise.reject(error)
  }
)

