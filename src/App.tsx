import "./App.css"
import { useState, Suspense, lazy, useEffect, useCallback } from "react"
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { AuthAPI } from "@/api/auth"
import { SessionProvider } from "@/contexts/session-context"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { SessionExpiredModal } from "@/components/session-expired-modal"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { DashboardLayout } from "@/components/layouts/DashboardLayout"

import { CalendarCallbackHandler } from "@/components/routes/CalendarCallbackHandler"

// Lazy load page components for code splitting
const LoginPage = lazy(() => import("@/components/login-page").then(module => ({ default: module.LoginPage })))

// Import page wrappers for pages that need onPageChange
import {
  AdminAnalyticsPageWrapper,
  AdminMFASettingsPageWrapper,
  DoctorAnalyticsPageWrapper,
  NotFoundPageWrapper,
} from "@/components/routes/PageWrappers"
import { AuthRedirect } from "@/components/routes/AuthRedirect"

// Lazy load page components for code splitting
const DoctorAppointmentPage = lazy(() => import("@/components/doctorpages/appointment-page").then(module => ({ default: module.AppointmentPage })))
const DoctorPatientsPage = lazy(() => import("@/components/doctorpages/patients-page").then(module => ({ default: module.PatientsPage })))
const DoctorLogsPage = lazy(() => import("@/components/doctorpages/logs-page").then(module => ({ default: module.LogsPage })))
const DoctorFrontDeskPage = lazy(() => import("@/components/doctorpages/front-desk-page").then(module => ({ default: module.FrontDeskPage })))
const DoctorRefillRequestsPage = lazy(() => import("@/components/doctorpages/refill-requests-page").then(module => ({ default: module.RefillRequestsPage })))
const DoctorSettingsPage = lazy(() => import("@/components/doctorpages/settings-page").then(module => ({ default: module.SettingsPage })))
const DoctorCalendarIntegrations = lazy(() => import("@/components/doctorpages/calendar-integrations").then(module => ({ default: module.CalendarIntegrations })))

const AdminAppointmentPage = lazy(() => import("@/components/adminpages/appointment-page").then(module => ({ default: module.AppointmentPage })))
const AdminDoctorsPage = lazy(() => import("@/components/adminpages/doctors-page").then(module => ({ default: module.DoctorsPage })))
const AdminPatientsPage = lazy(() => import("@/components/adminpages/patients-page").then(module => ({ default: module.PatientsPage })))
const AdminLogsPage = lazy(() => import("@/components/adminpages/logs-page").then(module => ({ default: module.LogsPage })))

const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL
}

// SSO Login handler component
function SSOLoginHandler() {
  const navigate = useNavigate()
  const { refreshProfile, setAccessToken } = useAuth()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processSSO = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const ssoToken = urlParams.get('token')

        if (ssoToken) {
          const response = await AuthAPI.ssoLogin({ token: ssoToken })
          if (response.access_token) {
            setAccessToken(response.access_token)
          }

          // Refresh profile to load doctor/clinic data via AuthContext
          await refreshProfile()

          navigate('/doctor/appointments', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (error) {
        console.error('SSO login error:', error)
        navigate('/login', { replace: true })
      } finally {
        setIsProcessing(false)
      }
    }

    processSSO()
  }, [navigate, refreshProfile])

  if (isProcessing) {
    return null
  }

  return null
}

// Main App Router Component
function AppRouter() {
  const { role, doctor, clinic, admin, isLoading: authLoading, refreshProfile, clearAuth } = useAuth()

  const handleLogin = async (userRole: 'admin' | 'doctor') => {
    // Profile will be loaded automatically by AuthProvider when token is set
    // Just trigger a refresh to ensure data is loaded
    await refreshProfile()
  }

  const handleLogout = useCallback(() => {
    // Clear auth state through AuthProvider
    clearAuth()
  }, [clearAuth])

  // Show blank screen while loading auth
  if (authLoading) {
    // Avoid white flash on refresh by matching app background
    return <div className="min-h-screen bg-background" />
  }

  // Get user data based on role
  const userData = role === 'doctor' ? doctor : role === 'admin' ? admin : null
  const clinicData = role === 'doctor' ? clinic : null
  const userType = role || 'doctor'

  return (
    <SessionProvider onLogout={handleLogout}>
      <SessionExpiredModal />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/sso-login" element={<SSOLoginHandler />} />
        <Route path="/dashboard/calendar/callback/:provider" element={<CalendarCallbackHandler />} />
        <Route path="/calendar/callback/:provider" element={<CalendarCallbackHandler />} />
        <Route path="/dashboard/calendar/callback" element={<CalendarCallbackHandler />} />
        <Route path="/dashboard/*" element={<CalendarCallbackHandler />} />

        {/* Protected Doctor routes */}
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route
            path="/doctor/*"
            element={
              <DashboardLayout
                handleLogout={handleLogout}
                clinicData={clinicData}
                userData={userData}
                userType="doctor"
              />
            }
          >
            <Route path="analytics" element={<DoctorAnalyticsPageWrapper />} />
            <Route path="appointments" element={<DoctorAppointmentPage />} />
            <Route path="patients" element={<DoctorPatientsPage />} />
            <Route path="logs" element={<DoctorLogsPage />} />
            <Route path="front-desk" element={<DoctorFrontDeskPage />} />
            <Route path="refill-requests" element={<DoctorRefillRequestsPage />} />
            <Route path="settings" element={<DoctorSettingsPage />} />
            <Route path="calendar-integrations" element={<DoctorCalendarIntegrations />} />
            {/* Route back out to global NotFound so it shows full-screen (no layout) */}
            <Route path="*" element={<Navigate to="/not-found" replace />} />
          </Route>
        </Route>

        {/* Protected Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route
            path="/admin/*"
            element={
              <DashboardLayout
                handleLogout={handleLogout}
                clinicData={clinicData}
                userData={userData}
                userType="admin"
              />
            }
          >
            <Route path="analytics" element={<AdminAnalyticsPageWrapper />} />
            <Route path="appointments" element={<AdminAppointmentPage />} />
            <Route path="doctors" element={<AdminDoctorsPage />} />
            <Route path="patients" element={<AdminPatientsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="mfa-settings" element={<AdminMFASettingsPageWrapper />} />
            {/* Route back out to global NotFound so it shows full-screen (no layout) */}
            <Route path="*" element={<Navigate to="/not-found" replace />} />
          </Route>
        </Route>

        {/* Not found route - needs to be outside protected routes to work */}
        <Route path="/not-found" element={<NotFoundPageWrapper />} />

        {/* Default redirects */}
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
    </SessionProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Avoid white flash on refresh by using a neutral, background-matched fallback */}
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <AppRouter />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
