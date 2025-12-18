import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthStorage } from '@/api/auth'

interface SessionContextType {
    isSessionExpired: boolean
    setSessionExpired: (expired: boolean) => void
    handleLogout: () => void | Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
    children: ReactNode
    onLogout?: () => void
}

export function SessionProvider({ children, onLogout }: SessionProviderProps) {
    const [isSessionExpired, setIsSessionExpired] = useState(false)

    const handleLogout = useCallback(() => {
        // Call parent logout handler
        onLogout?.()
        setIsSessionExpired(false)
    }, [onLogout])

    // Listen for session expiration events from API calls
    useEffect(() => {
        const handleSessionExpiredEvent = () => {
            // console.log('🔒 Session expired event received')
            setIsSessionExpired(true)
        }

        window.addEventListener('session-expired', handleSessionExpiredEvent)
        return () => {
            window.removeEventListener('session-expired', handleSessionExpiredEvent)
        }
    }, [])

    return (
        <SessionContext.Provider value={{ isSessionExpired, setSessionExpired: setIsSessionExpired, handleLogout }}>
            {children}
        </SessionContext.Provider>
    )
}

export function useSession() {
    const context = useContext(SessionContext)
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider')
    }
    return context
}
