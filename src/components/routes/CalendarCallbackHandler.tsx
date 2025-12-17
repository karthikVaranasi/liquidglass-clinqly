import { useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"

export function CalendarCallbackHandler() {
    const navigate = useNavigate()
    const { provider } = useParams()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        // Get status and message from query params if present
        const status = searchParams.get("status")
        const message = searchParams.get("message")
        const error = searchParams.get("error")

        // Determine the provider name for display
        const providerName = provider === 'google' ? 'Google Calendar' :
            provider === 'microsoft' ? 'Microsoft Calendar' :
                'Calendar'

        if (error) {
            toast.error(decodeURIComponent(error))
        } else if (status === 'error') {
            toast.error(message ? decodeURIComponent(message) : `Failed to connect ${providerName}`)
        } else if (status === 'success') {
            toast.success(message ? decodeURIComponent(message) : `${providerName} connected successfully`)
        }

        // Always redirect back to the integrations page
        navigate("/doctor/calendar-integrations", { replace: true })
    }, [navigate, provider, searchParams])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-foreground/70">Completing connection...</p>
            </div>
        </div>
    )
}
