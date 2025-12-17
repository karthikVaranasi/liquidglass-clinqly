import { Navigate } from "react-router-dom"
import { AuthStorage } from "@/api/auth"

export function AuthRedirect() {
  const token = AuthStorage.getToken()
  const role = AuthStorage.getUserRole()

  // If authenticated, redirect to appropriate dashboard
  if (token && role) {
    const defaultRoute = role === 'admin' ? '/admin/analytics' : '/doctor/appointments'
    return <Navigate to={defaultRoute} replace />
  }

  // Otherwise, redirect to login
  return <Navigate to="/login" replace />
}

