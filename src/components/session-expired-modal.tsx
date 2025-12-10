import { LogIn, Clock } from 'lucide-react'
import { useSession } from '@/contexts/session-context'

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="neumorphic-modal p-8 text-center max-w-md mx-4">
                {/* Icon */}
                <div className="neumorphic-icon w-16 h-16 mx-auto mb-6">
                    <Clock className="w-8 h-8 text-[#14B5AA]" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-[#2d2d2d] mb-3">
                    Session Expired
                </h2>

                {/* Message */}
                <p className="text-[#5a5a5a] mb-8 leading-relaxed">
                    Your session has expired due to inactivity. Please log in again to continue.
                </p>

                {/* Login Button */}
                <button
                    onClick={handleLoginClick}
                    className="neumorphic-btn-primary w-full py-4 px-6 flex items-center justify-center gap-3 text-lg font-semibold"
                >
                    <LogIn className="w-5 h-5" />
                    <span>Log In Again</span>
                </button>
            </div>
        </div>
    )
}
