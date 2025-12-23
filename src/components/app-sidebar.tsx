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

const iconMap = {
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconLogs,
  IconUser,
  IconClipboardList,
  IconClockHour4,
}

const adminNavItems = [
  {
    title: "Analytics",
    url: "#",
    icon: "IconDashboard",
    page: "dashboard"
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
  const clinicName = (clinicData?.name || "").trim()
  const isLongClinicName = clinicName.length > 16
  const brandTextSizeClass = isLongClinicName ? "text-md" : "text-lg"
  const headerGapClass = isLongClinicName ? "-mb-4" : "-mb-4"

  const navItems = React.useMemo(() => {
    const source = userType === 'admin' ? adminNavItems : doctorNavItems
    return source.map(item => ({
      ...item,
      icon: iconMap[item.icon as keyof typeof iconMap]
    }))
  }, [userType])

  const resolvedUser = React.useMemo(() => {
    const fallbackName =
      userType === 'admin' ? 'Admin User' : 'Doctor'
    const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()

    return {
      name: userData?.name || fullName || fallbackName,
      email: userData?.email || '',
      avatar: userData?.avatar || '',
      role: userData?.role || (userData?.department ? `Dr. ${userData.department}` : ''),
      phone: userData?.phone_number || userData?.mobile_phone || userData?.phone || userData?.contact_number || clinicData?.phone_number || ''
    }
  }, [clinicData?.phone_number, userData, userType])

  return (
    <Sidebar {...props}>
      <SidebarHeader className={headerGapClass}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-3 hover:bg-transparent focus:bg-transparent active:bg-transparent"
            >
              <a href="#" className="flex items-center -mt-2 gap-2 min-h-[3rem] text-black dark:text-white">
                {userType === 'admin' ? (
                  // For admin users, always show app branding
                  <>
                    <img src="/logo.png" alt="EzMedTech Logo" className="w-7 h-7 object-contain rounded-full bg-white p-0.5 shadow-sm" />
                    <div className="text-lg font-semibold flex-1 min-w-0 max-w-[12rem] !truncate-0 min-h-[2rem] flex flex-col justify-center text-black dark:text-white">EzMedTech</div>
                  </>
                ) : (
                  // For doctor users, show clinic branding if available
                  <>
                    {clinicData?.logo_url ? (
                      <img
                        src={clinicData.logo_url}
                        alt={`${clinicData.name || 'Clinic'} Logo`}
                        className="w-7 h-7 object-contain rounded-full bg-white p-0.5 shadow-sm"
                        onError={(e) => {
                          // Fallback to default logo if clinic logo fails to load
                          e.currentTarget.src = "/logo.png"
                        }}
                      />
                    ) : (
                      <img src="/logo.png" alt="EzMedTech Logo" className="w-7 h-7 object-contain rounded-full bg-white p-0.5 shadow-sm" />
                    )}
                    <div
                      className={`${brandTextSizeClass} font-semibold leading-tight flex-1 min-w-0 max-w-[20rem] break-words text-black dark:text-white`}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        color: "var(--foreground)" // Default, will be overridden by dark mode text-white class but good fallback
                      }}
                      title={clinicName}
                    >
                      {clinicName}
                    </div>
                  </>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems}
          onPageChange={onPageChange}
          currentPage={currentPage}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={resolvedUser}
          onLogout={onLogout}
          onPageChange={onPageChange}
          userType={userType}
        />
      </SidebarFooter>
    </Sidebar>
  )
}

