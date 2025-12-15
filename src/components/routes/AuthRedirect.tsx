import { Navigate } from "react-router-dom"
import { AuthStorage } from "@/api/auth"

export function AuthRedirect() {
  const token = AuthStorage.getToken()
  const userType = AuthStorage.getUserType() as 'admin' | 'doctor' | null

  // If authenticated, redirect to appropriate dashboard
  if (token && userType) {
    const defaultRoute = userType === 'admin' ? '/admin/analytics' : '/doctor/appointments'
    return <Navigate to={defaultRoute} replace />
  }

  // Otherwise, redirect to login
  return <Navigate to="/login" replace />
}

