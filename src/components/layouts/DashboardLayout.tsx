import { Suspense, lazy } from "react"
import { Outlet } from "react-router-dom"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"
import { CountsProvider, useCounts } from "@/contexts/counts-context"
import { NavigationProvider, useNavigation } from "@/contexts/navigation-context"

// Dynamic imports for shared components
const AppSidebar = lazy(() => import("@/components/app-sidebar").then(module => ({ default: module.AppSidebar })))
const AppHeader = lazy(() => import("@/components/app-header").then(module => ({ default: module.AppHeader })))


function DashboardLayoutContent({
  handleLogout,
  clinicData,
  userData,
  userType,
}: {
  handleLogout: () => void
  clinicData: any
  userData: any
  userType: 'admin' | 'doctor'
}) {
  const { doctorsCount } = useCounts()
  const { navigateToPage, currentPage } = useNavigation()

  return (
    <SidebarProvider
      className="liquid-glass-app-bg"
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
        userType={userType}
      />
      <main className="flex-1 min-h-screen theme-transition">
        <AppHeader
          currentPage={currentPage}
          userType={userType}
          doctorsCount={doctorsCount ?? undefined}
          userData={userData}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col my-2">
            <div className="flex flex-col">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}

interface DashboardLayoutProps {
  handleLogout: () => void
  clinicData: any
  userData: any
  userType: 'admin' | 'doctor'
}

export function DashboardLayout({ handleLogout, clinicData, userData, userType }: DashboardLayoutProps) {
  return (
    <NavigationProvider userType={userType}>
      <CountsProvider>
        <Suspense fallback={<div className="min-h-screen liquid-glass-environment" />}>
          <DashboardLayoutContent
            handleLogout={handleLogout}
            clinicData={clinicData}
            userData={userData}
            userType={userType}
          />
        </Suspense>
      </CountsProvider>
    </NavigationProvider>
  )
}

