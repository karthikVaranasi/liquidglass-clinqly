import { LogIn, Clock } from 'lucide-react'
import { useSession } from '@/contexts/session-context'
import { Button } from '@/components/ui/button'

export function SessionExpiredModal() {
    const { isSessionExpired, handleLogout } = useSession()

    if (!isSessionExpired) {
        return null
    }

    const handleLoginClick = () => {
        handleLogout()
        // Force page reload to show login page
        window.location.reload()
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-4"
        >
            <div
                className="neumorphic-pressed flex flex-col items-center justify-center rounded-lg w-full max-w-xl mx-auto max-h-[90vh] bg-background"
            >
                <div className="p-5 flex flex-col items-center justify-center w-full">
                    {/* Header */}
                    <div className="flex flex-col items-center justify-center w-full mb-4">
                        <div className="flex flex-col items-center gap-3 w-full">
                            <Clock className="w-8 h-8 text-[#14B5AA]" />
                            <h2 className="text-base font-semibold text-center">Session Expired</h2>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-foreground mb-6 leading-relaxed text-center">
                        Your session has expired due to inactivity. Please log in again to continue.
                    </p>

                    {/* Login Button */}
                    <Button
                        onClick={handleLoginClick}
                        className="neumorphic-button-primary"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        Log In Again
                    </Button>
                </div>
            </div>
        </div>
    )
}
