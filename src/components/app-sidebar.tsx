import * as React from "react"
import {
  IconCalendar,
  IconClipboardList,
  IconDashboard,
  IconLogs,
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

// Static app config
const app = {
  name: "Maartha Clinic"
}

// Static default user (fallback)
const defaultUser = {
  name: "Martha Nelson",
  email: "martha.nelson@ezmedtech.ai",
  avatar: "/avatars/doctor.jpg",
  role: "General Physician",
  phone: "+14709448601"
}

// Static navigation items for doctor
const doctorNavItems = [
  {
    title: "Appointments",
    url: "#",
    icon: "IconCalendar",
    page: "appointments"
  },
  {
    title: "Analytics",
    url: "#",
    icon: "IconDashboard",
    page: "dashboard"
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
  },
  {
    title: "Front Desk",
    url: "#",
    icon: "IconUser",
    page: "front-desk"
  },
  {
    title: "Refill Requests",
    url: "#",
    icon: "IconClipboardList",
    page: "refill-requests"
  },
  {
    title: "Clinic Availability",
    url: "#",
    icon: "IconClockHour4",
    page: "settings"
  },
  {
    title: "Calendar Integrations",
    url: "#",
    icon: "IconCalendar",
    page: "calendar-integrations"
  }
]

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

export function AppSidebar({
  onPageChange,
  currentPage,
  onLogout,
  clinicData,
  userData,
  userType = 'doctor',
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onPageChange?: (page: string) => void
  currentPage?: string
  onLogout?: () => void
  clinicData?: any
  userData?: any
  userType?: 'admin' | 'doctor'
}) {
  // Transform navMain data based on user type
  const transformedData = React.useMemo(() => {
    if (userType === 'admin') {
      return {
        navMain: adminNavItems.map(item => ({
          ...item,
          icon: iconMap[item.icon as keyof typeof iconMap]
        })),
        user: defaultUser
      }
    } else {
      return {
        navMain: doctorNavItems.map(item => ({
          ...item,
          icon: iconMap[item.icon as keyof typeof iconMap]
        })),
        user: defaultUser
      }
    }
  }, [userType])

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
                {userType === 'admin' ? (
                  // For admin users, always show app branding
                  <>
                    <img src="/logo.svg" alt="EZ MedTech Logo" className="w-6 h-6 object-contain" />
                    <span className="text-lg font-semibold">EZ MedTech</span>
                  </>
                ) : (
                  // For doctor users, show clinic branding if available
                  <>
                    {clinicData?.logo_url ? (
                      <img
                        src={clinicData.logo_url}
                        alt={`${clinicData.name || 'Clinic'} Logo`}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          // Fallback to default logo if clinic logo fails to load
                          e.currentTarget.src = "/logo.svg"
                        }}
                      />
                    ) : (
                      <img src="/logo.svg" alt="EzMedTech Logo" className="w-6 h-6 object-contain" />
                    )}
                    <span className="text-lg font-semibold">
                      {clinicData?.name || app.name}
                    </span>
                  </>
                )}
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
          phone: userData.phone_number || userData.mobile_phone || userData.phone || userData.contact_number || ''
        } : transformedData.user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}

