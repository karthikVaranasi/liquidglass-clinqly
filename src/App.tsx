import "./App.css"
import { useState, Suspense, lazy } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"

// Lazy load page components for code splitting
const AnalyticsPage = lazy(() => import("@/components/analytics-page").then(module => ({ default: module.AnalyticsPage })))
const AppointmentPage = lazy(() => import("@/components/appointment-page").then(module => ({ default: module.AppointmentPage })))
const PatientsPage = lazy(() => import("@/components/patients-page").then(module => ({ default: module.PatientsPage })))
const LogsPage = lazy(() => import("@/components/logs-page").then(module => ({ default: module.LogsPage })))
const FrontDeskPage = lazy(() => import("@/components/front-desk-page").then(module => ({ default: module.FrontDeskPage })))
const RefillRequestsPage = lazy(() => import("@/components/refill-requests-page").then(module => ({ default: module.RefillRequestsPage })))
const SettingsPage = lazy(() => import("@/components/settings-page").then(module => ({ default: module.SettingsPage })))
const LoginPage = lazy(() => import("@/components/login-page").then(module => ({ default: module.LoginPage })))
const CalendarIntegrations = lazy(() => import("@/components/calendar-integrations").then(module => ({ default: module.CalendarIntegrations })))

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const handleLogin = (_type: 'admin' | 'doctor') => {
    setIsAuthenticated(true)
    setCurrentPage("appointments")
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
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
            <AnalyticsPage onPageChange={setCurrentPage} />
          </Suspense>
        )
      case "patients":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PatientsPage />
          </Suspense>
        )
      case "appointments":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AppointmentPage />
          </Suspense>
        )
      case "logs":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LogsPage />
          </Suspense>
        )
      case "front-desk":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FrontDeskPage />
          </Suspense>
        )
      case "refill-requests":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RefillRequestsPage />
          </Suspense>
        )
      case "settings":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
        )
      case "calendar-integrations":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CalendarIntegrations />
          </Suspense>
        )
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AppointmentPage />
          </Suspense>
        )
    }
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
      <AppSidebar variant="floating" onPageChange={setCurrentPage} currentPage={currentPage} onLogout={handleLogout} />
      <main className="flex-1">
        <AppHeader currentPage={currentPage} />
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
