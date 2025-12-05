const API_BASE_URL = 'https://staging-api.clinqly.ai'

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

export class AuthAPI {
  private static async makeRequest(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
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

  // Token validation - we can use this to check if a stored token is still valid
  static async validateToken(token: string): Promise<boolean> {
    try {
      // Try to make a request to a protected endpoint to validate the token
      // Using clinics endpoint which is simpler and should be protected
      const response = await fetch(`${API_BASE_URL}/dashboard/clinics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      // If we get a 401 or 403, token is invalid (unauthorized/forbidden)
      if (response.status === 401 || response.status === 403) {
        console.log('🔐 Token validation: unauthorized/forbidden')
        return false
      }

      // If we get a 200, token is valid
      // For other status codes (like 422 validation errors), we consider the token valid
      // since the error is not auth-related
      const isValid = response.ok || response.status === 422
      console.log(`🔐 Token validation result: ${isValid} (status: ${response.status})`)
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

  static clearAll(): void {
    this.removeToken()
    this.removeUserType()
    this.removeUserData()
  }

  static isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

// Appointments API functions
export class AppointmentsAPI {
  private static getAuthHeaders(): HeadersInit {
    const token = AuthStorage.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  static async getAllAppointments(params?: {
    doctor_id?: number
    status?: string
    clinic_id?: number
  }): Promise<any[]> {
    const queryParams = new URLSearchParams()
    if (params?.doctor_id) queryParams.append('doctor_id', params.doctor_id.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.clinic_id) queryParams.append('clinic_id', params.clinic_id.toString())

    const queryString = queryParams.toString()
    const url = `${API_BASE_URL}/dashboard/appointments${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.status}`)
    }

    return response.json()
  }

  static async getAppointmentsByPatient(patientId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/appointments/patient/${patientId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch patient appointments: ${response.status}`)
    }

    return response.json()
  }

  static async getFrontDeskRequests(clinicId: number): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/patients/requests/frontdesk/${clinicId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch front desk requests: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  static async getRefillRequests(clinicId: number): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/patients/refill-requests?clinic_id=${clinicId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch refill requests: ${response.status}`)
    }

    const data = await response.json()
    // API can return { requests: [...] } or { refill_requests: [...] } or directly an array
    if (Array.isArray(data)) {
      return data
    } else if (data.requests && Array.isArray(data.requests)) {
      return data.requests
    } else if (data.refill_requests && Array.isArray(data.refill_requests)) {
      return data.refill_requests
    }
    return []
  }

  static async bookAppointment(appointmentData: {
    clinic_id: number
    doctor_id: number
    patient_id: number
    date?: string
    time: string
    phone?: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/appointments/book`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(appointmentData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Failed to book appointment: ${response.status}`)
    }

    return response.json()
  }

  static async rescheduleAppointment(appointmentData: {
    appointment_id: number
    clinic_id: number
    doctor_id: number
    patient_id: number
    date: string
    time: string
    phone?: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/appointments/reschedule`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(appointmentData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Failed to reschedule appointment: ${response.status}`)
    }

    return response.json()
  }

  static async cancelAppointment(appointmentData: {
    clinic_id: number
    doctor_id: number
    patient_id: number
    appointment_id: number
    phone?: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/appointments/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(appointmentData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Failed to cancel appointment: ${response.status}`)
    }

    return response.json()
  }
}