import { Navigate, Outlet } from "react-router-dom"
import { AuthStorage } from "@/api/auth"

interface ProtectedRouteProps {
  allowedRoles: Array<'admin' | 'doctor'>
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = AuthStorage.getToken()
  const userType = AuthStorage.getUserType() as 'admin' | 'doctor' | null

  const getDefaultRoute = (role: 'admin' | 'doctor' | null) => {
    if (role === 'admin') return '/admin/analytics'
    if (role === 'doctor') return '/doctor/appointments'
    return '/login'
  }

  // If no token or user type, redirect to login
  if (!token || !userType) {
    return <Navigate to="/login" replace />
  }

  // If user type is not in allowed roles, redirect to not-found
  if (!allowedRoles.includes(userType)) {
    return <Navigate to={getDefaultRoute(userType)} replace />
  }

  // User is authenticated and has correct role, render child routes
  return <Outlet />
}

