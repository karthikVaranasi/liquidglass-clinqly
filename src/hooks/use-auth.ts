import { useAuthStore } from '@/stores/auth-store'
import type { DecodedToken } from '@/api/auth'

/**
 * Hook that provides auth state and actions
 * Maintains the same API as the old Context-based useAuth for backward compatibility
 */
export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const userId = useAuthStore((state) => state.userId)
  const clinicId = useAuthStore((state) => state.clinicId)
  const decodedToken = useAuthStore((state) => state.decodedToken)
  const doctor = useAuthStore((state) => state.doctor)
  const clinic = useAuthStore((state) => state.clinic)
  const admin = useAuthStore((state) => state.admin)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  return {
    accessToken,
    role,
    userId,
    clinicId,
    decodedToken,
    doctor,
    clinic,
    admin,
    isLoading,
    error,
    setAccessToken,
    clearAuth,
    refreshProfile,
  }
}

/**
 * Convenience hook that returns current user data based on role
 * Maintains the same API as the old useCurrentUser for backward compatibility
 */
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


