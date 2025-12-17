import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthStorage, type DecodedToken } from '@/api/auth'

interface Doctor {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  department?: string
  clinic_id?: number
  clinic_name?: string
  assigned_twilio_phone_number?: string
  phone_number?: string
  mobile_phone?: string
  phone?: string
  contact_number?: string
  avatar?: string
  role?: string
  [key: string]: any
}

interface Clinic {
  id: number
  name: string
  phone_number: string
  logo_url: string | null
  cancellation_window?: number
  address?: string
  created_at?: string
  [key: string]: any
}

interface Admin {
  id: number
  name: string
  email: string
  mfa_enabled?: boolean
  [key: string]: any
}

interface AuthContextType {
  // Token info
  role: 'admin' | 'doctor' | null
  userId: number | null
  clinicId: number | null
  decodedToken: DecodedToken | null

  // User data
  doctor: Doctor | null
  clinic: Clinic | null
  admin: Admin | null

  // Loading and error states
  isLoading: boolean
  error: string | null

  // Actions
  refreshProfile: () => Promise<void>
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [role, setRole] = useState<'admin' | 'doctor' | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [clinicId, setClinicId] = useState<number | null>(null)
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getApiBaseUrl = (): string => {
    return import.meta.env.VITE_API_BASE_URL
  }

  const fetchDoctorData = useCallback(async (doctorId: number): Promise<Doctor | null> => {
    try {
      const token = AuthStorage.getToken()
      if (!token) return null

      const response = await fetch(`${getApiBaseUrl()}/dashboard/doctors/${doctorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch doctor data: ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Error fetching doctor data:', err)
      return null
    }
  }, [])

  const fetchClinicData = useCallback(async (clinicId: number): Promise<Clinic | null> => {
    try {
      const token = AuthStorage.getToken()
      if (!token) return null

      const response = await fetch(`${getApiBaseUrl()}/dashboard/clinics/${clinicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch clinic data: ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Error fetching clinic data:', err)
      return null
    }
  }, [])

  const loadProfile = useCallback(async () => {
    const token = AuthStorage.getToken()
    if (!token) {
      setRole(null)
      setUserId(null)
      setClinicId(null)
      setDecodedToken(null)
      setDoctor(null)
      setClinic(null)
      setAdmin(null)
      setIsLoading(false)
      return
    }

    const decoded = AuthStorage.decodeToken(token)
    if (!decoded) {
      // Token is invalid or expired
      AuthStorage.clearAll()
      setRole(null)
      setUserId(null)
      setClinicId(null)
      setDecodedToken(null)
      setDoctor(null)
      setClinic(null)
      setAdmin(null)
      setIsLoading(false)
      return
    }

    setDecodedToken(decoded)
    setRole(decoded.role)

    const userIdNum = parseInt(decoded.sub, 10)
    setUserId(isNaN(userIdNum) ? null : userIdNum)
    setClinicId(decoded.clinic_id || null)

    setIsLoading(true)
    setError(null)

    try {
      if (decoded.role === 'doctor') {
        // Fetch doctor and clinic data
        const [doctorData, clinicData] = await Promise.all([
          userIdNum ? fetchDoctorData(userIdNum) : Promise.resolve(null),
          decoded.clinic_id ? fetchClinicData(decoded.clinic_id) : Promise.resolve(null),
        ])

        setDoctor(doctorData)
        setClinic(clinicData)
        setAdmin(null)
      } else if (decoded.role === 'admin') {
        // For admin, use data from JWT token
        setAdmin({
          id: userIdNum,
          name: decoded.name || '',
          email: decoded.email || '',
        })
        setDoctor(null)
        setClinic(null)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [fetchDoctorData, fetchClinicData])

  const refreshProfile = useCallback(async () => {
    await loadProfile()
  }, [loadProfile])

  const clearAuth = useCallback(() => {
    AuthStorage.clearAll()
    setRole(null)
    setUserId(null)
    setClinicId(null)
    setDecodedToken(null)
    setDoctor(null)
    setClinic(null)
    setAdmin(null)
    setIsLoading(false)
    setError(null)
  }, [])

  // Load profile on mount and when token changes
  useEffect(() => {
    loadProfile()

    // Listen for storage changes (e.g., when token is set in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === null) {
        loadProfile()
      }
    }

    // Listen for custom event (same-tab token changes)
    const handleTokenChanged = () => {
      loadProfile()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-token-changed', handleTokenChanged)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-token-changed', handleTokenChanged)
    }
  }, [loadProfile])

  return (
    <AuthContext.Provider
      value={{
        role,
        userId,
        clinicId,
        decodedToken,
        doctor,
        clinic,
        admin,
        isLoading,
        error,
        refreshProfile,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Convenience hook that returns current user data based on role
export function useCurrentUser() {
  const { role, doctor, admin, clinic } = useAuth()

  if (role === 'doctor') {
    return {
      role: 'doctor' as const,
      user: doctor,
      clinic,
    }
  } else if (role === 'admin') {
    return {
      role: 'admin' as const,
      user: admin,
      clinic: null,
    }
  }

  return {
    role: null,
    user: null,
    clinic: null,
  }
}

