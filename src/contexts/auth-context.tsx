import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { AuthStorage, type DecodedToken } from '@/api/auth'
import { http, setHttpTokenAccessors } from '@/api/shared/http'

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
  accessToken: string | null
  setAccessToken: (token: string | null, options?: { skipBroadcast?: boolean }) => void

  // User data
  doctor: Doctor | null
  clinic: Clinic | null
  admin: Admin | null

  // Loading and error states
  isLoading: boolean
  error: string | null

  // Actions
  refreshProfile: () => Promise<void>
  clearAuth: (options?: { skipBroadcast?: boolean }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const accessTokenRef = useRef<string | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const bootstrapAttemptedRef = useRef<boolean>(false)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
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
      const response = await http.get(`${getApiBaseUrl()}/dashboard/doctors/${doctorId}`)
      return response.data
    } catch (err) {
      console.error('Error fetching doctor data:', err)
      return null
    }
  }, [])

  const fetchClinicData = useCallback(async (clinicId: number): Promise<Clinic | null> => {
    try {
      const response = await http.get(`${getApiBaseUrl()}/dashboard/clinics/${clinicId}`)
      return response.data
    } catch (err) {
      console.error('Error fetching clinic data:', err)
      return null
    }
  }, [])

  const setAccessToken = useCallback((token: string | null, options?: { skipBroadcast?: boolean }) => {
    accessTokenRef.current = token
    setAccessTokenState(token)
    if (token) {
      AuthStorage.setToken(token)
    } else {
      AuthStorage.removeToken()
    }
    if (!options?.skipBroadcast) {
      window.dispatchEvent(new CustomEvent('auth-token-changed', { detail: { token } }))
      if (!token) {
        broadcastChannelRef.current?.postMessage({ type: 'logout' })
      }
    }
  }, [])

  const getAccessToken = useCallback(() => accessTokenRef.current, [])

  // Provide token accessors to axios layer
  useEffect(() => {
    setHttpTokenAccessors({
      getToken: getAccessToken,
      setToken: (token: string | null) => setAccessToken(token),
    })
  }, [getAccessToken, setAccessToken])

  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      if (!bootstrapAttemptedRef.current) {
        // Bootstrap will try to refresh using cookie; keep loading state
        return
      }
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
      clearAuth()
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

  const clearAuth = useCallback((options?: { skipBroadcast?: boolean }) => {
    setAccessToken(null, { skipBroadcast: options?.skipBroadcast })
    setRole(null)
    setUserId(null)
    setClinicId(null)
    setDecodedToken(null)
    setDoctor(null)
    setClinic(null)
    setAdmin(null)
    setIsLoading(false)
    setError(null)
    if (!options?.skipBroadcast) {
      broadcastChannelRef.current?.postMessage({ type: 'logout' })
    }
  }, [])

  // Load profile on mount and when token changes
  useEffect(() => {
    loadProfile()
  }, [loadProfile, accessToken])

  // Bootstrap refresh on mount when no token is present (cookie-based)
  useEffect(() => {
    if (accessToken || bootstrapAttemptedRef.current) return
    bootstrapAttemptedRef.current = true

    const runBootstrapRefresh = async () => {
      try {
        setIsLoading(true)
        const response = await http.post('/dashboard/auth/refresh', undefined, { skipAuthRefresh: true } as any)
        const newToken =
          (response.data as any)?.access_token ||
          (response.data as any)?.token ||
          (response.data as any)?.accessToken ||
          null

        if (newToken) {
          setAccessToken(newToken)
          await loadProfile()
          return
        }
      } catch (err) {
        console.warn('Bootstrap refresh failed:', err)
      }

      clearAuth()
      setIsLoading(false)
    }

    void runBootstrapRefresh()
  }, [accessToken, clearAuth, loadProfile, setAccessToken])

  // Cross-tab communication without persisting tokens
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('auth-events')
    broadcastChannelRef.current = channel
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') {
        clearAuth({ skipBroadcast: true })
      }
    }
    return () => {
      channel.close()
      broadcastChannelRef.current = null
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider
      value={{
        role,
        userId,
        clinicId,
        decodedToken,
        accessToken,
        setAccessToken,
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

