import "./App.css"
import { useState, Suspense, lazy, useEffect } from "react"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AuthStorage, AuthAPI } from "@/api/auth"
import { CountsProvider, useCounts } from "@/contexts/counts-context"

// Dynamic imports for shared components
const AppSidebar = lazy(() => import("@/components/app-sidebar").then(module => ({ default: module.AppSidebar })))
const AppHeader = lazy(() => import("@/components/app-header").then(module => ({ default: module.AppHeader })))

const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL
}

// Inner component to access counts context
function AppContent({
  currentPage,
  pageParams,
  navigateToPage,
  handleLogout,
  clinicData,
  userData,
  userType,
  renderContent
}: {
  currentPage: string
  pageParams: any
  navigateToPage: (pageOrObject: string | { page: string; params?: any }) => void
  handleLogout: () => void
  clinicData: any
  userData: any
  userType: string
  renderContent: () => React.ReactNode
}) {
  const { doctorsCount } = useCounts()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="floating"
        onPageChange={navigateToPage}
        currentPage={currentPage}
        onLogout={handleLogout}
        clinicData={clinicData}
        userData={userData}
        userType={userType as 'admin' | 'doctor'}
      />
      <main className="flex-1">
        <AppHeader currentPage={currentPage} userType={userType as 'admin' | 'doctor'} doctorsCount={doctorsCount ?? undefined} userData={userData} />
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
const AdminMFASettingsPage = lazy(() => import("@/components/adminpages/mfa-settings-page").then(module => ({ default: module.MFASettingsPage })))

const LoginPage = lazy(() => import("@/components/login-page").then(module => ({ default: module.LoginPage })))
const NotFoundPage = lazy(() => import("@/components/not-found-page").then(module => ({ default: module.NotFoundPage })))

// Synchronous authentication check before component renders
const getInitialAuthState = () => {
  const token = AuthStorage.getToken()
  const userType = AuthStorage.getUserType()
  const storedUserData = AuthStorage.getUserData()
  return !!(token && userType && storedUserData)
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [pageParams, setPageParams] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(() => getInitialAuthState()) // Synchronous initial state
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [clinicData, setClinicData] = useState<any>(null)

  // Get user type to determine which components to use
  const userType = (AuthStorage.getUserType() || 'doctor') as 'admin' | 'doctor'
  const isAdmin = userType === 'admin'

  // Validate current page based on user type
  useEffect(() => {
    if (isAuthenticated) {
      const adminPages = ['dashboard', 'appointments', 'doctors', 'patients', 'logs', 'mfa-settings']
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
      const response = await fetch(`${getApiBaseUrl()}/dashboard/clinics/${clinicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AuthStorage.getToken()}`,
        },
      })

      if (response.ok) {
        const clinic = await response.json()
        console.log('✅ Clinic data fetched:', clinic)
        setClinicData(clinic)
        AuthStorage.setClinicData(clinic) // Store clinic data in localStorage
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
      console.log('👨‍⚕️ Fetching doctor data for doctor ID:', doctorId)
      const response = await fetch(`${getApiBaseUrl()}/dashboard/doctors/${doctorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AuthStorage.getToken()}`,
        },
      })

      if (response.ok) {
        const doctor = await response.json()
        console.log('✅ Doctor data fetched:', doctor)
        console.log('📱 Phone fields in response:', {
          phone: doctor.phone,
          phone_number: doctor.phone_number,
          mobile_phone: doctor.mobile_phone,
          contact_number: doctor.contact_number
        })
        // Merge with existing userData to get complete profile including phone
        const baseData = currentUserData || userData || {}
        const updatedUserData = { ...baseData, ...doctor }
        console.log('👤 Updated user data with phone:', updatedUserData)
        setUserData(updatedUserData)
        AuthStorage.setUserData(updatedUserData) // Update stored user data
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

  // Enhanced page navigation function that handles page and optional parameters
  const navigateToPage = (pageOrObject: string | { page: string; params?: any }) => {
    if (typeof pageOrObject === 'string') {
      setCurrentPage(pageOrObject)
      setPageParams(null)
    } else {
      setCurrentPage(pageOrObject.page)
      setPageParams(pageOrObject.params || null)
    }
  }

  // Expose navigation function globally for use in page components
  useEffect(() => {
    window.navigateToPage = navigateToPage
    return () => {
      delete window.navigateToPage
    }
  }, [])

  // Check for stored authentication token on app load
  useEffect(() => {
    console.log('🔍 Running async authentication validation...')

    // Check for SSO login URL parameters first
    const urlParams = new URLSearchParams(window.location.search)
    const ssoToken = urlParams.get('token')

    if (ssoToken && window.location.pathname === '/sso-login') {
      console.log('🔗 SSO login detected, processing...')
      // Handle SSO login asynchronously
      AuthAPI.ssoLogin({ token: ssoToken })
        .then((response) => {
          console.log('💾 Storing SSO auth data...')
          AuthStorage.setToken(response.access_token)
          AuthStorage.setUserType('doctor')
          AuthStorage.setUserData(response.doctor)

          setUserData(response.doctor)

          // Fetch additional data asynchronously
          if (response.doctor?.clinic_id) {
            fetchClinicData(response.doctor.clinic_id)
          }
          if (response.doctor?.id) {
            fetchDoctorData(response.doctor.id, response.doctor)
          }

          console.log('✅ SSO login successful, redirecting to appointments')
          window.history.replaceState({}, document.title, '/')
          setIsAuthenticated(true)
          setCurrentPage("appointments")
        })
        .catch((error) => {
          console.error('💥 SSO login failed:', error)
          window.history.replaceState({}, document.title, '/')
          setIsAuthenticated(false)
        })
      return
    }

    const token = AuthStorage.getToken()
    const userType = AuthStorage.getUserType()
    const storedUserData = AuthStorage.getUserData()

    console.log('📦 Stored token exists:', !!token)
    console.log('👤 Stored user type:', userType)

    if (token && userType && storedUserData) {
      console.log('🎉 Found stored auth data, validating...')

      // Set user data and page immediately (optimistic)
      setUserData(storedUserData)
      setCurrentPage(userType === 'admin' ? 'dashboard' : 'appointments')

      // Fetch additional data asynchronously
      if (storedUserData?.clinic_id) {
        fetchClinicData(storedUserData.clinic_id).catch(err => {
          console.warn('Failed to fetch clinic data on refresh:', err)
        })
      }

      if (userType === 'doctor' && storedUserData?.id) {
        fetchDoctorData(storedUserData.id, storedUserData).catch(err => {
          console.warn('Failed to fetch doctor data on refresh:', err)
        })
      }
    } else {
      console.log('ℹ️ No stored auth data found')
      setIsAuthenticated(false)
      setUserData(null)
      setClinicData(null)
    }

    console.log('🏁 Async authentication check complete')
  }, [])

  const handleLogin = async (type: 'admin' | 'doctor', userData?: any) => {
    console.log('🔑 Login successful, setting up user data...', { type, userData })

    setUserData(userData)

    // Fetch clinic data only for doctors (admins see app branding)
    if (type === 'doctor' && userData?.clinic_id) {
      await fetchClinicData(userData.clinic_id)
    }
    // Fetch full doctor profile (includes phone number)
    if (type === 'doctor' && userData?.id) {
      await fetchDoctorData(userData.id, userData)
    }
    // Note: Admin users will see "EzMedTech" branding, no clinic/doctor data needed

    setIsAuthenticated(true)
    setCurrentPage(type === 'admin' ? 'dashboard' : 'appointments')
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


    switch (currentPage) {
      case "dashboard":
        return (
          isAdmin ? <AdminAnalyticsPage onPageChange={navigateToPage} /> : <DoctorAnalyticsPage onPageChange={navigateToPage} />
        )
      case "patients":
        return (
          isAdmin ? <AdminPatientsPage /> : <DoctorPatientsPage />
        )
      case "appointments":
        return (
          isAdmin ? <AdminAppointmentPage /> : <DoctorAppointmentPage />
        )
      case "logs":
        return (
          isAdmin ? <AdminLogsPage /> : <DoctorLogsPage />
        )
      case "doctors":
        return (
          isAdmin ? <AdminDoctorsPage pageParams={pageParams} /> : <DoctorPatientsPage />
        )
      case "front-desk":
        return (
          <DoctorFrontDeskPage />
        )
      case "refill-requests":
        return (
          <DoctorRefillRequestsPage />
        )
      case "settings":
        return (
          <DoctorSettingsPage />
        )
      case "calendar-integrations":
        return (
          <DoctorCalendarIntegrations />
        )
      case "mfa-settings":
        return (
          isAdmin ? <AdminMFASettingsPage onPageChange={navigateToPage} /> : <DoctorAppointmentPage />
        )
      default:
        return (
          <NotFoundPage onPageChange={navigateToPage} userType={userType as 'admin' | 'doctor'} />
        )
    }
  }



  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
    <LoginPage onLogin={handleLogin} />
    )
  }

  return (
    <CountsProvider>
      <AppContent
        currentPage={currentPage}
        pageParams={pageParams}
        navigateToPage={navigateToPage}
        handleLogout={handleLogout}
        clinicData={clinicData}
        userData={userData}
        userType={userType}
        renderContent={renderContent}
      />
    </CountsProvider>
  )
}
