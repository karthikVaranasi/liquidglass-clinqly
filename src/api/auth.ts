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

// Auth token storage utilities
export class AuthStorage {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly USER_TYPE_KEY = 'user_type'
  private static readonly USER_DATA_KEY = 'user_data'
  private static readonly CLINIC_DATA_KEY = 'clinic_data'
  private static readonly ADMIN_IMPERSONATING_KEY = 'admin_impersonating'

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
  }

  static setUserType(userType: 'admin' | 'doctor'): void {
    localStorage.setItem(this.USER_TYPE_KEY, userType)
  }

  static getUserType(): 'admin' | 'doctor' | null {
    const type = localStorage.getItem(this.USER_TYPE_KEY)
    return type === 'admin' || type === 'doctor' ? type : null
  }

  static removeUserType(): void {
    localStorage.removeItem(this.USER_TYPE_KEY)
  }

  static setUserData(userData: any): void {
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData))
  }

  static getUserData(): any | null {
    const data = localStorage.getItem(this.USER_DATA_KEY)
    return data ? JSON.parse(data) : null
  }

  static removeUserData(): void {
    localStorage.removeItem(this.USER_DATA_KEY)
  }

  static setClinicData(clinicData: any): void {
    localStorage.setItem(this.CLINIC_DATA_KEY, JSON.stringify(clinicData))
  }

  static getClinicData(): any | null {
    const data = localStorage.getItem(this.CLINIC_DATA_KEY)
    return data ? JSON.parse(data) : null
  }

  static removeClinicData(): void {
    localStorage.removeItem(this.CLINIC_DATA_KEY)
  }

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
    this.removeUserType()
    this.removeUserData()
    this.removeClinicData()
    this.removeAdminImpersonating()
  }

  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}
