import { SidebarTrigger } from "@/components/ui/sidebar"
import data from "@/data.json"

interface AppHeaderProps {
  currentPage?: string
}

export function AppHeader({ currentPage }: AppHeaderProps) {
  const { app, navMain, frontDeskRequests } = data

  // Map page keys to display names with counts
  const getPageTitle = (page: string) => {
    const navItem = navMain.find(item => item.page === page)
    if (!navItem) return app.name

    let title = navItem.title

    // Add counts for specific pages
    if (page === 'front-desk') {
      title += ` (${frontDeskRequests.length})`
    }

    return title
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <span className="text-lg font-semibold">
          {currentPage ? getPageTitle(currentPage) : "EZ MedTech"}
        </span>
      </div>
      <div className="flex items-center gap-4">

        
        {/* Admin Branding */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="EZ MedTech Logo"
              className="w-6 h-6 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-tight">
                Powered by
              </span>
              <span className="text-sm font-semibold text-foreground leading-tight">
                EZ MedTech
              </span>
            </div>
          </div>
      </div>
    </header>
  )
}
