import { createFriendlyError } from "@/lib/errors"

const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL
}

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
}

export interface AdminLoginAsDoctorResponse {
  message: string
  doctor: any
  access_token: string
}

export class AuthAPI {
  private static async makeRequest(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: undefined }))
      throw createFriendlyError(response.status, errorData.message, 'login')
    }

    return response.json()
  }

  private static async makeAuthenticatedRequest(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthStorage.getToken()}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: undefined }))
      throw createFriendlyError(response.status, errorData.message, 'data')
    }

    return response.json()
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
    return this.makeAuthenticatedRequest('/dashboard/auth/admin/login-as-doctor', data)
  }

  // Token validation - we can use this to check if a stored token is still valid
  static async validateToken(token: string): Promise<boolean> {
    try {
      // Try to make a request to a protected endpoint to validate the token
      // Using clinics endpoint which is simpler and should be protected
      const response = await fetch(`${getApiBaseUrl()}/dashboard/clinics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      // If we get a 401 or 403, token is invalid (unauthorized/forbidden)
      if (response.status === 401 || response.status === 403) {
        // console.log('🔐 Token validation: unauthorized/forbidden')
        return false
      }

      // If we get a 200, token is valid
      // For other status codes (like 422 validation errors), we consider the token valid
      // since the error is not auth-related
      const isValid = response.ok || response.status === 422
      // console.log(`🔐 Token validation result: ${isValid} (status: ${response.status})`)
      return isValid

    } catch (error) {
      // Network errors or other issues - consider token invalid
      console.warn('💥 Token validation network error:', error)
      return false
    }
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
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly ADMIN_IMPERSONATING_KEY = 'admin_impersonating'

  // Token management
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
    // Dispatch custom event for same-tab token changes
    window.dispatchEvent(new CustomEvent('auth-token-changed', { detail: { token } }))
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
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
