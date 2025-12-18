import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useCounts } from "@/contexts/counts-context"
import { AuthStorage } from "@/api/auth"
import { useAuth } from "@/hooks/use-auth"
import { callLogoutEndpoint } from "@/api/shared/http"

// Static app config
const app = {
  name: "Maartha Clinic"
}

// Static navigation items for doctor (used for page title lookup)
const doctorNavItems = [
  { title: "Appointments", page: "appointments" },
  { title: "Analytics", page: "dashboard" },
  { title: "Patients", page: "patients" },
  { title: "Logs", page: "logs" },
  { title: "Front Desk", page: "front-desk" },
  { title: "Refill Requests", page: "refill-requests" },
  { title: "Clinic Availability", page: "settings" },
  { title: "Calendar Integrations", page: "calendar-integrations" }
]

// Admin navigation items
const adminNavItems = [
  { title: "Analytics", page: "dashboard" },
  { title: "Appointments", page: "appointments" },
  { title: "Doctors", page: "doctors" },
  { title: "Patients", page: "patients" },
  { title: "Logs", page: "logs" }
]

interface AppHeaderProps {
  currentPage?: string
  userType?: 'admin' | 'doctor'
  doctorsCount?: number
  userData?: any
}

export function AppHeader({ currentPage, userType = 'doctor', doctorsCount, userData }: AppHeaderProps) {
  const { frontDeskCount, refillRequestsCount } = useCounts()
  const { clearAuth } = useAuth()

  // Get the appropriate navigation items based on user type
  const navItems = userType === 'admin' ? adminNavItems : doctorNavItems

  // Map page keys to display names with counts
  const getPageTitle = (page: string) => {
    const navItem = navItems.find(item => item.page === page)
    if (!navItem) return userType === 'admin' ? "EzMedTech" : app.name

    let title = navItem.title

    // Add counts for specific pages
    if (page === 'doctors' && doctorsCount !== undefined) {
      title += ` (${doctorsCount})`
    } else if (userType === 'doctor') {
      if (page === 'front-desk' && frontDeskCount !== null) {
        title += ` (${frontDeskCount})`
      } else if (page === 'refill-requests' && refillRequestsCount !== null) {
        title += ` (${refillRequestsCount})`
      }
    }

    return title
  }

  return (
    <header className="sticky top-0 z-50 bg-background">
      {/* Admin Impersonation Banner */}
      {AuthStorage.isAdminImpersonating() && userType === 'doctor' && userData && (
        <div className="px-4 pt-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span>👑 Admin logged in as {userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim()}</span>
            <Button
              onClick={async () => {
                // Call logout endpoint to revoke refresh token
                await callLogoutEndpoint()
                // Clear auth state
                clearAuth({ skipBootstrap: true })
                // Clear impersonation flag
                AuthStorage.removeAdminImpersonating()
                // Reload to return to admin view
                window.location.reload()
              }}
              size="sm"
              className="rounded-full text-xs font-medium transition-colors"
            >
              Exit Impersonation
            </Button>
          </div>
        </div>
      )}

      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <span className="text-lg font-semibold">
            {currentPage ? getPageTitle(currentPage) : (userType === 'admin' ? "EzMedTech" : app.name)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Branding - Powered by EzMedTech */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt={userType === 'admin' ? "EzMedTech Logo" : "EzMedTech Logo"}
              className="w-6 h-6 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-tight">
                Powered by
              </span>
              <span className="text-sm font-semibold text-foreground leading-tight">
                {userType === 'admin' ? 'EzMedTech' : 'EzMedTech'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

