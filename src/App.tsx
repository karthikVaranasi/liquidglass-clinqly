import "./App.css"
import { useState, Suspense, lazy, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { AuthStorage, AuthAPI } from "@/api/auth"
import { SessionProvider } from "@/contexts/session-context"
import { SessionExpiredModal } from "@/components/session-expired-modal"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { DashboardLayout } from "@/components/layouts/DashboardLayout"

// Dynamic imports for shared components
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
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processSSO = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const ssoToken = urlParams.get('token')

        if (ssoToken) {
          const response = await AuthAPI.ssoLogin({ token: ssoToken })
          AuthStorage.setToken(response.access_token)
          AuthStorage.setUserType('doctor')
          AuthStorage.setUserData(response.doctor)

          // Fetch additional data asynchronously
          if (response.doctor?.clinic_id) {
            fetch(`${getApiBaseUrl()}/dashboard/clinics/${response.doctor.clinic_id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${response.access_token}`,
              },
            })
              .then(res => res.ok ? res.json() : null)
              .then(clinic => {
                if (clinic) AuthStorage.setClinicData(clinic)
              })
              .catch(err => console.warn('Failed to fetch clinic data:', err))
          }

          if (response.doctor?.id) {
            fetch(`${getApiBaseUrl()}/dashboard/doctors/${response.doctor.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${response.access_token}`,
              },
            })
              .then(res => res.ok ? res.json() : null)
              .then(doctor => {
                if (doctor) {
                  const updatedUserData = { ...response.doctor, ...doctor }
                  AuthStorage.setUserData(updatedUserData)
                }
              })
              .catch(err => console.warn('Failed to fetch doctor data:', err))
          }

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
  }, [navigate])

  if (isProcessing) {
    return null
  }

  return null
}

// Main App Router Component
function AppRouter() {
  const [isValidatingAuth, setIsValidatingAuth] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [clinicData, setClinicData] = useState<any>(null)
  const [authValidationInProgress, setAuthValidationInProgress] = useState(false)

  const userType = (AuthStorage.getUserType() || 'doctor') as 'admin' | 'doctor'

  // Function to fetch clinic data
  const fetchClinicData = async (clinicId: number) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/dashboard/clinics/${clinicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AuthStorage.getToken()}`,
        },
      })

      if (response.ok) {
        const clinic = await response.json()
        setClinicData(clinic)
        AuthStorage.setClinicData(clinic)
        return clinic
      } else {
        console.warn('⚠️ Failed to fetch clinic data:', response.status)
        return null
      }
    } catch (error) {
      console.error('💥 Error fetching clinic data:', error)
      return null
    }
  }

  // Function to fetch full doctor profile (includes phone number)
  const fetchDoctorData = async (doctorId: number, currentUserData?: any) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/dashboard/doctors/${doctorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AuthStorage.getToken()}`,
        },
      })

      if (response.ok) {
        const doctor = await response.json()
        const baseData = currentUserData || userData || {}
        const updatedUserData = { ...baseData, ...doctor }
        setUserData(updatedUserData)
        AuthStorage.setUserData(updatedUserData)
        return doctor
      } else {
        console.warn('⚠️ Failed to fetch doctor data:', response.status)
        return null
      }
    } catch (error) {
      console.error('💥 Error fetching doctor data:', error)
      return null
    }
  }

  // Check for stored authentication token on app load
  useEffect(() => {
    if (authValidationInProgress) {
      return
    }

    const validateStoredAuth = async () => {
      setAuthValidationInProgress(true)

      try {
        // Check for stored authentication data
        const token = AuthStorage.getToken()
        const storedUserType = AuthStorage.getUserType()
        const storedUserData = AuthStorage.getUserData()
        const storedClinicData = AuthStorage.getClinicData()

        if (storedClinicData) {
          setClinicData(storedClinicData)
        }

        if (token && storedUserType && storedUserData) {
          try {
            // Validate the stored token before showing any UI
            const isTokenValid = await AuthAPI.validateToken(token)

            if (isTokenValid) {
              // Set user data after token validation
              setUserData(storedUserData)

              // Fetch additional data asynchronously (don't block UI on these)
              if (storedUserData?.clinic_id && !storedClinicData) {
                fetchClinicData(storedUserData.clinic_id).catch(err => {
                  console.warn('Failed to fetch clinic data on refresh:', err)
                })
              }

              if (storedUserType === 'doctor' && storedUserData?.id) {
                fetchDoctorData(storedUserData.id, storedUserData).catch(err => {
                  console.warn('Failed to fetch doctor data on refresh:', err)
                })
              }
            } else {
              // Token is invalid, clear auth data
              AuthStorage.clearAll()
              setUserData(null)
              setClinicData(null)
            }
          } catch (error) {
            console.error('💥 Token validation network error:', error)
            // Don't clear auth data on network errors - assume token is still valid
            // Still set up the user session with stored data
            setUserData(storedUserData)

            // Try to fetch additional data, but don't fail if network is down
            if (storedUserData?.clinic_id && !storedClinicData) {
              fetchClinicData(storedUserData.clinic_id).catch(err => {
                console.warn('Failed to fetch clinic data on refresh (network issue):', err)
              })
            }

            if (storedUserType === 'doctor' && storedUserData?.id) {
              fetchDoctorData(storedUserData.id, storedUserData).catch(err => {
                console.warn('Failed to fetch doctor data on refresh (network issue):', err)
              })
            }
          }
        } else {
          setUserData(null)
          setClinicData(null)
        }
      } finally {
        setIsValidatingAuth(false)
        setAuthValidationInProgress(false)
      }
    }

    validateStoredAuth()
  }, []) // Empty dependency array - run only once on mount

  const handleLogin = async (type: 'admin' | 'doctor', loginUserData?: any) => {
    setUserData(loginUserData)

    // Fetch clinic data only for doctors (admins see app branding)
    if (type === 'doctor' && loginUserData?.clinic_id) {
      await fetchClinicData(loginUserData.clinic_id)
    }
    // Fetch full doctor profile (includes phone number)
    if (type === 'doctor' && loginUserData?.id) {
      await fetchDoctorData(loginUserData.id, loginUserData)
    }
    
    // Navigation will be handled by ProtectedRoute redirecting to default page
  }

  const handleLogout = () => {
    AuthStorage.clearAll()
    setUserData(null)
    setClinicData(null)
  }

  // Show blank screen while validating authentication
  if (isValidatingAuth) {
    // Avoid white flash on refresh by matching app background
    return <div className="min-h-screen bg-background" />
  }

  return (
    <SessionProvider onLogout={handleLogout}>
      <SessionExpiredModal />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/sso-login" element={<SSOLoginHandler />} />

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
      {/* Avoid white flash on refresh by using a neutral, background-matched fallback */}
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <AppRouter />
      </Suspense>
    </BrowserRouter>
  )
}
