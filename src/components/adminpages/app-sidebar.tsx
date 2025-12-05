import * as React from "react"
import {
  IconCalendar,
  IconClipboardList,
  IconDashboard,
  IconLogs,
  // IconMedicalCross,
  IconUser,
  IconUsers,
  IconClockHour4,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import data from "@/data.json"


// Create icon mapping for navMain data
const iconMap = {
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconLogs,
  IconUser,
  IconClipboardList,
  IconClockHour4,
}

// Admin navigation items - only show specific pages
const adminNavItems = [
  {
    title: "Analytics",
    url: "#",
    icon: "IconDashboard",
    page: "analytics"
  },
  {
    title: "Appointments",
    url: "#",
    icon: "IconCalendar",
    page: "appointments"
  },
  {
    title: "Doctors",
    url: "#",
    icon: "IconUsers",
    page: "doctors"
  },
  {
    title: "Patients",
    url: "#",
    icon: "IconUsers",
    page: "patients"
  },
  {
    title: "Logs",
    url: "#",
    icon: "IconLogs",
    page: "logs"
  }
]

// Transform navMain data to include actual icon components
const transformedData = {
  ...data,
  navMain: adminNavItems.map(item => ({
    ...item,
    icon: iconMap[item.icon as keyof typeof iconMap]
  }))
}

export function AppSidebar({
  onPageChange,
  currentPage,
  onLogout,
  clinicData,
  userData,
  userType,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onPageChange?: (page: string) => void
  currentPage?: string
  onLogout?: () => void
  clinicData?: any
  userData?: any
  userType?: 'admin' | 'doctor'
}) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent focus:bg-transparent active:bg-transparent"
            >
              <a href="#" className="flex items-center">
                {/* Admin users always see EZ MedTech branding */}
                <img src="/logo.svg" alt="EZ MedTech Logo" className="w-6 h-6 object-contain" />
                <span className="text-lg font-semibold">EZ MedTech</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={transformedData.navMain}
          onPageChange={onPageChange}
          currentPage={currentPage}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData ? {
          name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User',
          email: userData.email || '',
          avatar: userData.avatar || '',
          role: userData.role || (userData.department ? `Dr. ${userData.department}` : ''),
          phone: userData.phone_number || userData.mobile_phone || ''
        } : transformedData.user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
