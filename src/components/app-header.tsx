import { SidebarTrigger } from "@/components/ui/sidebar"
import { useCounts } from "@/contexts/counts-context"

// Static app config
const app = {
  name: "Maartha Clinic"
}

// Static navigation items for doctor (used for page title lookup)
const navMain = [
  { title: "Appointments", page: "appointments" },
  { title: "Analytics", page: "dashboard" },
  { title: "Patients", page: "patients" },
  { title: "Logs", page: "logs" },
  { title: "Front Desk", page: "front-desk" },
  { title: "Refill Requests", page: "refill-requests" },
  { title: "Clinic Availability", page: "settings" },
  { title: "Calendar Integrations", page: "calendar-integrations" }
]

interface AppHeaderProps {
  currentPage?: string
  userType?: 'admin' | 'doctor'
}

export function AppHeader({ currentPage, userType = 'doctor' }: AppHeaderProps) {
  const { frontDeskCount, refillRequestsCount } = useCounts()

  // Map page keys to display names with counts
  const getPageTitle = (page: string) => {
    const navItem = navMain.find(item => item.page === page)
    if (!navItem) return userType === 'admin' ? "EZ MedTech" : app.name

    let title = navItem.title

    // Add counts for specific pages (only for doctor)
    if (userType === 'doctor') {
      if (page === 'front-desk' && frontDeskCount !== null) {
        title += ` (${frontDeskCount})`
      } else if (page === 'refill-requests' && refillRequestsCount !== null) {
        title += ` (${refillRequestsCount})`
      }
    }

    return title
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <span className="text-lg font-semibold">
          {currentPage ? getPageTitle(currentPage) : (userType === 'admin' ? "EZ MedTech" : app.name)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {/* Branding - Powered by EzMedTech */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt={userType === 'admin' ? "EZ MedTech Logo" : "EzMedTech Logo"}
            className="w-6 h-6 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium leading-tight">
              Powered by
            </span>
            <span className="text-sm font-semibold text-foreground leading-tight">
              {userType === 'admin' ? 'EZ MedTech' : 'EzMedTech'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

