import { createContext, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"

interface NavigationContextType {
  navigateToPage: (pageOrObject: string | { page: string; params?: any }) => void
  currentPage: string
  userType: 'admin' | 'doctor'
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

export function NavigationProvider({ 
  children, 
  userType 
}: { 
  children: React.ReactNode
  userType: 'admin' | 'doctor'
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const getPageFromPath = (pathname: string): string => {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.length < 2) return 'dashboard'
    
    const [, pageSegment] = pathSegments
    const segmentToPage: Record<string, string> = {
      analytics: 'dashboard',
      appointments: 'appointments',
      patients: 'patients',
      logs: 'logs',
      doctors: 'doctors',
      'front-desk': 'front-desk',
      'refill-requests': 'refill-requests',
      settings: 'settings',
      'calendar-integrations': 'calendar-integrations',
      'mfa-settings': 'mfa-settings',
    }
    
    return segmentToPage[pageSegment] || 'dashboard'
  }

  const navigateToPage = (pageOrObject: string | { page: string; params?: any }) => {
    const rolePrefix = userType === 'admin' ? '/admin' : '/doctor'
    const pageToSegment: Record<string, string> = {
      dashboard: 'analytics',
      appointments: 'appointments',
      patients: 'patients',
      logs: 'logs',
      doctors: 'doctors',
      'front-desk': 'front-desk',
      'refill-requests': 'refill-requests',
      settings: 'settings',
      'calendar-integrations': 'calendar-integrations',
      'mfa-settings': 'mfa-settings',
    }
    
    let page: string
    if (typeof pageOrObject === 'string') {
      page = pageOrObject
    } else {
      page = pageOrObject.page
      // Note: params are not used in URL routing currently, but kept for compatibility
    }
    
    const segment = pageToSegment[page] || 'analytics'
    navigate(`${rolePrefix}/${segment}`)
  }

  const currentPage = getPageFromPath(location.pathname)

  return (
    <NavigationContext.Provider value={{ navigateToPage, currentPage, userType }}>
      {children}
    </NavigationContext.Provider>
  )
}

