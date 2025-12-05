import "./App.css"
import { useState, Suspense, lazy, useEffect } from "react"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AuthStorage, AuthAPI } from "@/api/auth"

// Dynamic imports for user-specific components
const DoctorSidebar = lazy(() => import("@/components/doctorpages/app-sidebar").then(module => ({ default: module.AppSidebar })))
const DoctorHeader = lazy(() => import("@/components/doctorpages/app-header").then(module => ({ default: module.AppHeader })))
const AdminSidebar = lazy(() => import("@/components/adminpages/app-sidebar").then(module => ({ default: module.AppSidebar })))
const AdminHeader = lazy(() => import("@/components/adminpages/app-header").then(module => ({ default: module.AppHeader })))

const API_BASE_URL = 'https://staging-api.clinqly.ai'

// Lazy load page components for code splitting
const DoctorAnalyticsPage = lazy(() => import("@/components/doctorpages/analytics-page").then(module => ({ default: module.AnalyticsPage })))
const DoctorAppointmentPage = lazy(() => import("@/components/doctorpages/appointment-page").then(module => ({ default: module.AppointmentPage })))
const DoctorPatientsPage = lazy(() => import("@/components/doctorpages/patients-page").then(module => ({ default: module.PatientsPage })))
const DoctorLogsPage = lazy(() => import("@/components/doctorpages/logs-page").then(module => ({ default: module.LogsPage })))
const DoctorFrontDeskPage = lazy(() => import("@/components/doctorpages/front-desk-page").then(module => ({ default: module.FrontDeskPage })))
const DoctorRefillRequestsPage = lazy(() => import("@/components/doctorpages/refill-requests-page").then(module => ({ default: module.RefillRequestsPage })))
const DoctorSettingsPage = lazy(() => import("@/components/doctorpages/settings-page").then(module => ({ default: module.SettingsPage })))
const DoctorCalendarIntegrations = lazy(() => import("@/components/doctorpages/calendar-integrations").then(module => ({ default: module.CalendarIntegrations })))

const AdminAnalyticsPage = lazy(() => import("@/components/adminpages/analytics-page").then(module => ({ default: module.AnalyticsPage })))
const AdminAppointmentPage = lazy(() => import("@/components/adminpages/appointment-page").then(module => ({ default: module.AppointmentPage })))
const AdminDoctorsPage = lazy(() => import("@/components/adminpages/doctors-page").then(module => ({ default: module.DoctorsPage })))
const AdminPatientsPage = lazy(() => import("@/components/adminpages/patients-page").then(module => ({ default: module.PatientsPage })))
const AdminLogsPage = lazy(() => import("@/components/adminpages/logs-page").then(module => ({ default: module.LogsPage })))

const LoginPage = lazy(() => import("@/components/login-page").then(module => ({ default: module.LoginPage })))

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [clinicData, setClinicData] = useState<any>(null)

  // Get user type to determine which components to use
  const userType = AuthStorage.getUserType() || 'doctor'
  const isAdmin = userType === 'admin'

  // Validate current page based on user type
  useEffect(() => {
    if (isAuthenticated) {
      const adminPages = ['dashboard', 'appointments', 'doctors', 'patients', 'logs']
      const doctorPages = ['dashboard', 'appointments', 'patients', 'logs', 'front-desk', 'refill-requests', 'settings', 'calendar-integrations']

      const validPages = isAdmin ? adminPages : doctorPages

      if (!validPages.includes(currentPage)) {
        console.log(`⚠️ Invalid page "${currentPage}" for ${isAdmin ? 'admin' : 'doctor'} user, redirecting to dashboard`)
        setCurrentPage('dashboard')
      }
    }
  }, [currentPage, isAuthenticated, isAdmin])

  // Function to fetch clinic data
  const fetchClinicData = async (clinicId: number) => {
    try {
      console.log('🏥 Fetching clinic data for clinic ID:', clinicId)
      const response = await fetch(`${API_BASE_URL}/dashboard/clinics/${clinicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AuthStorage.getToken()}`,
        },
      })

      if (response.ok) {
        const clinic = await response.json()
        console.log('✅ Clinic data fetched:', clinic)
        setClinicData(clinic)
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

  // Check for stored authentication token on app load
  useEffect(() => {
    const checkStoredAuth = async () => {
      console.log('🔍 Checking stored authentication...')

      // Check for SSO login URL parameters first
      const urlParams = new URLSearchParams(window.location.search)
      const ssoToken = urlParams.get('token')

      if (ssoToken && window.location.pathname === '/sso-login') {
        console.log('🔗 SSO login detected, processing...')
        try {
          const response = await AuthAPI.ssoLogin({ token: ssoToken })
          console.log('💾 Storing SSO auth data...')
          AuthStorage.setToken(response.access_token)
          AuthStorage.setUserType('doctor') // SSO typically returns doctor user
          AuthStorage.setUserData(response.doctor)

          setUserData(response.doctor)

          // Fetch clinic data if doctor has clinic_id
          if (response.doctor?.clinic_id) {
            await fetchClinicData(response.doctor.clinic_id)
          }

          console.log('✅ SSO login successful, redirecting to appointments')

          // Clear URL parameters and redirect
          window.history.replaceState({}, document.title, '/')
          setIsAuthenticated(true)
          setCurrentPage("appointments")
          setIsLoading(false)
          return
        } catch (error) {
          console.error('💥 SSO login failed:', error)
          // Clear URL parameters and continue with normal flow
          window.history.replaceState({}, document.title, '/')
          setIsLoading(false)
          return
        }
      }

      const token = AuthStorage.getToken()
      const userType = AuthStorage.getUserType()
      const storedUserData = AuthStorage.getUserData()

      console.log('📦 Stored token exists:', !!token)
      console.log('👤 Stored user type:', userType)

      if (token && userType && storedUserData) {
        console.log('🔐 Validating stored token...')
        try {
          // Validate the stored token
          const isValid = await AuthAPI.validateToken(token)
          console.log('✅ Token validation result:', isValid)

          if (isValid) {
            console.log('🎉 Token valid, auto-logging in user')
            setUserData(storedUserData)

            // Fetch clinic data if user has clinic_id
            if (storedUserData?.clinic_id) {
              await fetchClinicData(storedUserData.clinic_id)
            }
            // Note: For admin users, we don't fetch clinic data since they should see app branding
            // The sidebar will automatically show "EZ MedTech" and logo.svg for admins

            setIsAuthenticated(true)
            setCurrentPage("appointments")
          } else {
            console.log('❌ Token invalid, clearing stored data')
            // Token is invalid, clear stored data
            AuthStorage.clearAll()
            setUserData(null)
            setClinicData(null)
          }
        } catch (error) {
          console.error('💥 Token validation error:', error)
          AuthStorage.clearAll()
          setUserData(null)
          setClinicData(null)
        }
      } else {
        console.log('ℹ️ No stored token or user type found')
        setUserData(null)
        setClinicData(null)
      }

      console.log('🏁 Setting loading to false')
      setIsLoading(false)
    }

    checkStoredAuth()
  }, [])

  const handleLogin = async (type: 'admin' | 'doctor', userData?: any) => {
    console.log('🔑 Login successful, setting up user data...', { type, userData })

    setUserData(userData)

    // Fetch clinic data only for doctors (admins see app branding)
    if (type === 'doctor' && userData?.clinic_id) {
      await fetchClinicData(userData.clinic_id)
    }
    // Note: Admin users will see "EZ MedTech" branding, no clinic data needed

    setIsAuthenticated(true)
    setCurrentPage("appointments")
  }

  const handleLogout = () => {
    console.log('🚪 Logging out user, clearing stored data...')
    AuthStorage.clearAll()
    console.log('✅ Auth data cleared')
    setIsAuthenticated(false)
    setUserData(null)
    setClinicData(null)
    setCurrentPage("dashboard")
  }


  const renderContent = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="">Loading...</div>
      </div>
    )


    switch (currentPage) {
      case "dashboard":
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminAnalyticsPage onPageChange={setCurrentPage} /> : <DoctorAnalyticsPage onPageChange={setCurrentPage} />}
          </Suspense>
        )
      case "patients":
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminPatientsPage /> : <DoctorPatientsPage />}
          </Suspense>
        )
      case "appointments":
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminAppointmentPage /> : <DoctorAppointmentPage />}
          </Suspense>
        )
      case "logs":
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminLogsPage /> : <DoctorLogsPage />}
          </Suspense>
        )
      case "doctors":
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminDoctorsPage /> : <DoctorPatientsPage />}
          </Suspense>
        )
      case "front-desk":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DoctorFrontDeskPage />
          </Suspense>
        )
      case "refill-requests":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DoctorRefillRequestsPage />
          </Suspense>
        )
      case "settings":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DoctorSettingsPage />
          </Suspense>
        )
      case "calendar-integrations":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DoctorCalendarIntegrations />
          </Suspense>
        )
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isAdmin ? <AdminAppointmentPage /> : <DoctorAppointmentPage />}
          </Suspense>
        )
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="">Loading...</div>
        </div>
      }>
        <LoginPage onLogin={handleLogin} />
      </Suspense>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Suspense fallback={
        <div className="w-64 bg-background border-r animate-pulse">
          <div className="h-16 border-b"></div>
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      }>
        {isAdmin ? (
          <AdminSidebar
            variant="floating"
            onPageChange={setCurrentPage}
            currentPage={currentPage}
            onLogout={handleLogout}
            clinicData={clinicData}
            userData={userData}
            userType={userType}
          />
        ) : (
          <DoctorSidebar
            variant="floating"
            onPageChange={setCurrentPage}
            currentPage={currentPage}
            onLogout={handleLogout}
            clinicData={clinicData}
            userData={userData}
            userType={userType}
          />
        )}
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={
          <div className="h-16 bg-background border-b animate-pulse flex items-center px-4">
            <div className="h-8 w-32 bg-muted rounded"></div>
          </div>
        }>
          {isAdmin ? (
            <AdminHeader currentPage={currentPage} />
          ) : (
            <DoctorHeader currentPage={currentPage} />
          )}
        </Suspense>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col my-2">
            <div className="flex flex-col">
              {renderContent()}

            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
