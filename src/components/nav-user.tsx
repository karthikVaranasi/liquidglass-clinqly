import {
  IconDotsVertical,
  IconLogout,
  IconMail,
  IconStethoscope,
  IconPhone,
  IconShield,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
  onLogout,
  onPageChange,
  userType,
}: {
  user: {
    name: string
    email: string
    avatar: string
    role?: string
    phone?: string
  }
  onLogout?: () => void
  onPageChange?: (page: string) => void
  userType?: 'admin' | 'doctor'
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:neumorphic-pressed data-[state=open]:text-sidebar-accent-foreground neumorphic-soft neumorphic-hover neumorphic-active"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userType === 'doctor' ? `Dr. ${user.name}` : user.name}</span>
                <span className="truncate text-xs">
                  {user.role?.replace(/^Dr\.\s*/i, '') || user.email || "null"}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg neumorphic-card"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-3 text-left text-sm neumorphic-soft rounded-t-lg">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userType === 'doctor' ? `Dr. ${user.name}` : user.name}</span>
                  <span className="truncate text-xs flex items-center gap-1" style={{ textTransform: 'none' }}>
                    <IconMail className="w-3 h-3" />
                    {user.email || "null"}
                  </span>
                  {user.role && (
                    <span className="truncate text-xs flex items-center gap-1">
                      <IconStethoscope className="w-3 h-3" />
                      {user.role.replace(/^Dr\.\s*/i, '')}
                    </span>
                  )}
                  {user.phone && (
                    <span className="truncate text-xs flex items-center gap-1">
                      <IconPhone className="w-3 h-3" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            {userType === 'admin' && onPageChange && (
              <>
                <DropdownMenuSeparator className="neumorphic-inset mx-2" />
                <DropdownMenuItem
                  onClick={() => onPageChange("mfa-settings")}
                  className="w-full mx-auto neumorphic-button-primary cursor-pointer"
                >
                  <IconShield />
                  MFA Settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="neumorphic-inset mx-2" />
            <DropdownMenuItem
              onClick={onLogout}
              className="w-full mx-auto neumorphic-button-primary cursor-pointer"
            >
              <IconLogout />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
