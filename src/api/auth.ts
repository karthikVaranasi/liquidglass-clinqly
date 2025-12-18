import axios from "axios"
import { createFriendlyError } from "@/lib/errors"
import { http } from "./shared/http"

export interface LoginRequest {
  email: string
  password: string
  mfa_code?: string
}

export interface AdminLoginResponse {
  message: string
  admin?: any
  access_token?: string
  mfa_required: boolean
}

export interface DoctorLoginResponse {
  message: string
  doctor: any
  access_token: string
}

export interface SSOLoginRequest {
  token: string
}

export interface SSOLoginResponse {
  message: string
  doctor: any
  access_token: string
  token_type: string
}

export interface AdminLoginAsDoctorRequest {
  doctor_id: number
  mfa_code?: string
}

export interface AdminLoginAsDoctorResponse {
  message: string
  doctor: any
  access_token: string
}

export class AuthAPI {
  private static async makeRequest(endpoint: string, data: any): Promise<any> {
    try {
      const response = await http.post(endpoint, data, { skipAuthRefresh: true } as any)
      return response.data
    } catch (error) {
      throw this.normalizeError(error, 'login')
    }
  }

  private static async makeAuthenticatedRequest(endpoint: string, data: any, config?: { skipAuthRefresh?: boolean }): Promise<any> {
    try {
      const requestConfig = config ? { skipAuthRefresh: config.skipAuthRefresh } as any : undefined
      const response = await http.post(endpoint, data, requestConfig)
      return response.data
    } catch (error) {
      throw this.normalizeError(error, 'data')
    }
  }

  static async adminLogin(data: LoginRequest): Promise<AdminLoginResponse> {
    return this.makeRequest('/dashboard/auth/admin/login', data)
  }

  static async doctorLogin(data: LoginRequest): Promise<DoctorLoginResponse> {
    return this.makeRequest('/dashboard/auth/doctor/login', data)
  }

  static async ssoLogin(data: SSOLoginRequest): Promise<SSOLoginResponse> {
    return this.makeRequest('/dashboard/auth/sso-login', data)
  }

  static async adminLoginAsDoctor(data: AdminLoginAsDoctorRequest): Promise<AdminLoginAsDoctorResponse> {
    // Skip refresh on 401 so we can handle MFA requirement
    return this.makeAuthenticatedRequest('/dashboard/auth/admin/login-as-doctor', data, { skipAuthRefresh: true })
  }

  // Token validation - we can use this to check if a stored token is still valid
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await http.get('/dashboard/clinics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        skipAuthRefresh: true,
      } as any)

      // If we get a 200, token is valid. 422 still considered valid.
      return response.status >= 200 && response.status < 300 || response.status === 422

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        if (status === 401 || status === 403) {
          return false
        }
      }
      // Network errors or other issues - consider token invalid
      console.warn('💥 Token validation network error:', error)
      return false
    }
  }

  private static normalizeError(error: unknown, context: 'login' | 'data') {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500
      const message = typeof error.response?.data?.message === 'string'
        ? error.response?.data.message
        : undefined
      return createFriendlyError(status, message, context)
    }
    if (error instanceof Error) return error
    return createFriendlyError(500, undefined, context)
  }
}

// JWT Token Payload Interface
export interface DecodedToken {
  sub: string
  name?: string
  email?: string
  clinic_id?: number
  role: 'admin' | 'doctor'
  exp: number
}

// Auth token storage utilities
export class AuthStorage {
  private static memoryToken: string | null = null
  private static readonly ADMIN_IMPERSONATING_KEY = 'admin_impersonating'

  // Token management
  static setToken(token: string): void {
    this.memoryToken = token
  }

  static getToken(): string | null {
    return this.memoryToken
  }

  static removeToken(): void {
    this.memoryToken = null
  }

  // JWT Decoding helpers
  static decodeToken(token: string | null): DecodedToken | null {
    if (!token) return null

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const payload = parts[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return null
      }

      return decoded as DecodedToken
    } catch (error) {
      console.warn('Failed to decode token:', error)
      return null
    }
  }

  static getDecodedToken(): DecodedToken | null {
    const token = this.getToken()
    return this.decodeToken(token)
  }

  static getUserRole(): 'admin' | 'doctor' | null {
    const decoded = this.getDecodedToken()
    return decoded?.role || null
  }

  static getUserId(): number | null {
    const decoded = this.getDecodedToken()
    if (!decoded?.sub) return null
    const userId = parseInt(decoded.sub, 10)
    return isNaN(userId) ? null : userId
  }

  static getClinicId(): number | null {
    const decoded = this.getDecodedToken()
    return decoded?.clinic_id || null
  }

  // Admin impersonation (still needed)
  static setAdminImpersonating(isImpersonating: boolean): void {
    localStorage.setItem(this.ADMIN_IMPERSONATING_KEY, isImpersonating.toString())
  }

  static isAdminImpersonating(): boolean {
    return localStorage.getItem(this.ADMIN_IMPERSONATING_KEY) === 'true'
  }

  static removeAdminImpersonating(): void {
    localStorage.removeItem(this.ADMIN_IMPERSONATING_KEY)
  }

  static clearAll(): void {
    this.removeToken()
    this.removeAdminImpersonating()
  }

  static isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false

    // Check if token is valid and not expired
    const decoded = this.decodeToken(token)
    return decoded !== null
  }

  // Deprecated methods - kept for backward compatibility during migration
  // These will be removed after all components are migrated
  /** @deprecated Use getUserRole() instead */
  static getUserType(): 'admin' | 'doctor' | null {
    return this.getUserRole()
  }

  /** @deprecated Use AuthContext instead */
  static getUserData(): any | null {
    return null
  }

  /** @deprecated Use AuthContext instead */
  static getClinicData(): any | null {
    return null
  }
}
