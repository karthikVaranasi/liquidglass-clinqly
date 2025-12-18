import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"

interface ProtectedRouteProps {
  allowedRoles: Array<'admin' | 'doctor'>
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { accessToken, role } = useAuth()

  const getDefaultRoute = (userRole: 'admin' | 'doctor' | null) => {
    if (userRole === 'admin') return '/admin/analytics'
    if (userRole === 'doctor') return '/doctor/appointments'
    return '/login'
  }

  // If no token or role, redirect to login
  if (!accessToken || !role) {
    return <Navigate to="/login" replace />
  }

  // If user role is not in allowed roles, redirect to their default route
  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRoute(role)} replace />
  }

  // User is authenticated and has correct role, render child routes
  return <Outlet />
}

