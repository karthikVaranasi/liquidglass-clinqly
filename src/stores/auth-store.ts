import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
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

interface AuthState {
  // Token info
  accessToken: string | null
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

  // Internal flags
  bootstrapAttempted: boolean
  skipBootstrap: boolean
}

interface AuthActions {
  setAccessToken: (token: string | null, options?: { skipBroadcast?: boolean }) => void
  clearAuth: (options?: { skipBroadcast?: boolean; skipBootstrap?: boolean }) => void
  loadProfile: () => Promise<void>
  refreshProfile: () => Promise<void>
  bootstrapRefresh: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL
}

const fetchDoctorData = async (doctorId: number): Promise<Doctor | null> => {
  try {
    // Lazy import to avoid circular dependency
    const { http } = await import('@/api/shared/http')
    const response = await http.get(`${getApiBaseUrl()}/dashboard/doctors/${doctorId}`)
    return response.data
  } catch (err) {
    console.error('Error fetching doctor data:', err)
    return null
  }
}

const fetchClinicData = async (clinicId: number): Promise<Clinic | null> => {
  try {
    // Lazy import to avoid circular dependency
    const { http } = await import('@/api/shared/http')
    const response = await http.get(`${getApiBaseUrl()}/dashboard/clinics/${clinicId}`)
    return response.data
  } catch (err) {
    console.error('Error fetching clinic data:', err)
    return null
  }
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    accessToken: null,
    role: null,
    userId: null,
    clinicId: null,
    decodedToken: null,
    doctor: null,
    clinic: null,
    admin: null,
    isLoading: true,
    error: null,
    bootstrapAttempted: false,
    skipBootstrap: false,

    setAccessToken: (token: string | null) => {
      set({ accessToken: token })
      
      // Sync with AuthStorage for backward compatibility (only for decodeToken usage in other parts)
      // Use try-catch to avoid initialization issues
      try {
        if (token) {
          AuthStorage.setToken(token)
          set({ skipBootstrap: false })
        } else {
          AuthStorage.removeToken()
        }
      } catch (err) {
        // AuthStorage might not be initialized yet, but that's okay
        // The store is the source of truth
        console.warn('AuthStorage sync failed:', err)
      }
    },

    clearAuth: (options?: { skipBootstrap?: boolean }) => {
      if (options?.skipBootstrap) {
        set({ skipBootstrap: true })
      }
      
      get().setAccessToken(null)
      set({
        role: null,
        userId: null,
        clinicId: null,
        decodedToken: null,
        doctor: null,
        clinic: null,
        admin: null,
        isLoading: false,
        error: null,
      })
    },

    loadProfile: async () => {
      const token = get().accessToken
      
      if (!token) {
        if (!get().bootstrapAttempted) {
          // Bootstrap will try to refresh using cookie; keep loading state
          return
        }
        set({
          role: null,
          userId: null,
          clinicId: null,
          decodedToken: null,
          doctor: null,
          clinic: null,
          admin: null,
          isLoading: false,
        })
        return
      }

      const decoded = AuthStorage.decodeToken(token)
      if (!decoded) {
        // Token is invalid or expired
        set({
          accessToken: null,
          role: null,
          userId: null,
          clinicId: null,
          decodedToken: null,
          doctor: null,
          clinic: null,
          admin: null,
          isLoading: false,
          error: null,
        })
        AuthStorage.removeToken()
        return
      }

      set({
        decodedToken: decoded,
        role: decoded.role,
        userId: parseInt(decoded.sub, 10) || null,
        clinicId: decoded.clinic_id || null,
        isLoading: true,
        error: null,
      })

      const userIdNum = parseInt(decoded.sub, 10)

      try {
        if (decoded.role === 'doctor') {
          // Fetch doctor and clinic data
          const [doctorData, clinicData] = await Promise.all([
            userIdNum ? fetchDoctorData(userIdNum) : Promise.resolve(null),
            decoded.clinic_id ? fetchClinicData(decoded.clinic_id) : Promise.resolve(null),
          ])

          set({
            doctor: doctorData,
            clinic: clinicData,
            admin: null,
          })
        } else if (decoded.role === 'admin') {
          // For admin, use data from JWT token
          set({
            admin: {
              id: userIdNum,
              name: decoded.name || '',
              email: decoded.email || '',
            },
            doctor: null,
            clinic: null,
          })
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        set({
          error: err instanceof Error ? err.message : 'Failed to load profile',
        })
      } finally {
        set({ isLoading: false })
      }
    },

    refreshProfile: async () => {
      await get().loadProfile()
    },

    bootstrapRefresh: async () => {
      const state = get()
      
      if (state.accessToken || state.bootstrapAttempted || state.skipBootstrap) {
        return
      }

      set({ bootstrapAttempted: true })

      try {
        set({ isLoading: true })
        // Lazy import to avoid circular dependency
        const { http } = await import('@/api/shared/http')
        const response = await http.post('/dashboard/auth/refresh', undefined, { skipAuthRefresh: true } as any)
        const newToken =
          (response.data as any)?.access_token ||
          (response.data as any)?.token ||
          (response.data as any)?.accessToken ||
          null

        if (newToken) {
          get().setAccessToken(newToken)
          await get().loadProfile()
          return
        }
      } catch (err) {
        console.warn('Bootstrap refresh failed:', err)
      }

      get().clearAuth()
      set({ isLoading: false })
    },
  }))
)

// Initialize store on client side (delay to avoid circular dependency issues)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure all modules are fully loaded
  setTimeout(() => {
    // Reset skipBootstrap flag on page load
    useAuthStore.setState({ skipBootstrap: false })
    
    // Run bootstrap refresh if needed (only once)
    const state = useAuthStore.getState()
    if (!state.accessToken && !state.bootstrapAttempted && !state.skipBootstrap) {
      useAuthStore.getState().bootstrapRefresh()
    }

    // Load profile when token changes (only when token is set, not when cleared)
    useAuthStore.subscribe(
      (state) => state.accessToken,
      (accessToken, previousAccessToken) => {
        // Only load profile if token was set (not when cleared)
        if (accessToken !== null && accessToken !== previousAccessToken) {
          useAuthStore.getState().loadProfile()
        }
      }
    )
  }, 0)
}

