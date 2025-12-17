import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export function AuthRedirect() {
  const { accessToken, role } = useAuth()

  // If authenticated, redirect to appropriate dashboard
  if (accessToken && role) {
    const defaultRoute = role === 'admin' ? '/admin/analytics' : '/doctor/appointments'
    return <Navigate to={defaultRoute} replace />
  }

  // Otherwise, redirect to login
  return <Navigate to="/login" replace />
}

