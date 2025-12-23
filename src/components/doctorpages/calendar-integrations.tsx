import { useState, useEffect } from "react"
import { IconPlus, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { getToastErrorMessage } from "@/lib/errors"
import { AuthStorage } from "@/api/auth"
import { useAuth } from "@/hooks/use-auth"
import { CalendarAPI } from "@/api/doctor"
import type { CalendarAccount, CalendarAccountsResponse } from "@/api/doctor"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Google Calendar SVG Icon Component
const GoogleCalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <img
    src="https://img.icons8.com/color/48/google-calendar--v2.png"
    alt="Google Calendar"
    className={className}
  />
)

// Microsoft Outlook Calendar SVG Icon Component
const MicrosoftCalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <img
    src="https://img.icons8.com/color/48/outlook-calendar.png"
    alt="Microsoft Outlook Calendar"
    className={className}
  />
)

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function CalendarIntegrations() {
  const [showModal, setShowModal] = useState(false)
  const [showMicrosoftModal, setShowMicrosoftModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [accountsData, setAccountsData] = useState<CalendarAccountsResponse | null>(null)
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null)

  // Get doctor ID from auth context
  const { userId: doctorId } = useAuth()

  // Fetch calendar accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!doctorId) {
        setIsLoading(false)
        return
      }

      try {
        const data = await CalendarAPI.getCalendarAccounts(doctorId)
        setAccountsData(data)
      } catch (error) {
        console.error("Failed to fetch calendar accounts:", error)
        // Don't show error toast on initial load - might just be no accounts yet
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [doctorId])

  // Handle Google Calendar connect
  const handleConnectGoogle = () => {
    if (!doctorId) {
      toast.error("Doctor ID not found")
      return
    }
    setIsConnecting(true)
    CalendarAPI.connectGoogle(doctorId)
    // Page will redirect, so no need to set isConnecting back to false
  }

  // Handle Microsoft Calendar connect
  const handleConnectMicrosoft = () => {
    if (!doctorId) {
      toast.error("Doctor ID not found")
      return
    }
    setIsConnecting(true)
    CalendarAPI.connectMicrosoft(doctorId)
    // Page will redirect, so no need to set isConnecting back to false
  }
  // Set primary calendar account
  const handleSetPrimary = async (accountId: number, provider: 'google' | 'microsoft') => {
    if (!doctorId) return

    setSettingPrimaryId(accountId)

    try {
      await CalendarAPI.setPrimaryAccount(doctorId, accountId, provider)

      // Update local state to reflect new primary
      if (accountsData) {
        const updatedData: CalendarAccountsResponse = { ...accountsData }
        if (provider === "google") {
          updatedData.google_accounts = updatedData.google_accounts.map((a) => ({
            ...a,
            is_primary: a.id === accountId,
          }))
        } else {
          updatedData.microsoft_accounts = updatedData.microsoft_accounts.map((a) => ({
            ...a,
            is_primary: a.id === accountId,
          }))
        }
        setAccountsData(updatedData)
      }

      toast.success("Primary calendar updated")
    } catch (error) {
      console.error("Failed to set primary:", error)
      toast.error(getToastErrorMessage(error, "data", "Failed to set primary calendar"))
    } finally {
      setSettingPrimaryId(null)
    }
  }

  // Disconnect a calendar account
  const handleDisconnect = async (accountId: number, provider: 'google' | 'microsoft') => {
    if (!doctorId) return

    setDisconnectingId(accountId)

    try {
      await CalendarAPI.disconnectAccount(doctorId, accountId, provider)

      if (accountsData) {
        const updatedData: CalendarAccountsResponse = { ...accountsData }

        if (provider === "google") {
          updatedData.google_accounts = updatedData.google_accounts.filter(
            (a) => a.id !== accountId,
          )
        } else {
          updatedData.microsoft_accounts = updatedData.microsoft_accounts.filter(
            (a) => a.id !== accountId,
          )
        }

        updatedData.total_accounts = updatedData.total_accounts - 1
        setAccountsData(updatedData)
      }

      toast.success("Calendar account disconnected")
    } catch (error) {
      console.error("Failed to disconnect calendar account:", error)
      toast.error(getToastErrorMessage(error, "data", "Failed to disconnect calendar account"))
    } finally {
      setDisconnectingId(null)
    }
  }

  // Render account card
  const renderAccountCard = (account: CalendarAccount, provider: 'google' | 'microsoft') => (
    <div key={account.id} className="flex items-center justify-between my-3 p-4 bg-white/50 dark:bg-gradient-to-r dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-900" style={{ textTransform: 'none' }}>{account.email}</p>
          <div className="text-xs text-gray-600 dark:text-gray-500">
            Connected: {formatDate(account.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Primary toggle */}
        {account.is_primary ? (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-300 cursor-default">
            Primary
          </span>
        ) : (
          <Button
            size="sm"
            disabled={settingPrimaryId === account.id}
            onClick={() => handleSetPrimary(account.id, provider)}
            className="neumorphic-button-primary"
          >
            {settingPrimaryId === account.id ? (
              <>
                <IconLoader2 className="w-3 h-3 mr-1 animate-spin" />
                Updating...
              </>
            ) : (
              "Set primary"
            )}
          </Button>
        )}

        {/* Disconnect button */}
        {account.is_primary ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  disabled
                  className="neumorphic-button-destructive opacity-50 cursor-not-allowed"
                >
                  Disconnect
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              Primary account cannot be disconnected
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="sm"
            disabled={disconnectingId === account.id}
            onClick={() => handleDisconnect(account.id, provider)}
            className="neumorphic-button-destructive"
          >
            {disconnectingId === account.id ? (
              <>
                <IconLoader2 className="w-3 h-3 mr-1 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading calendar integrations...</div>
        </div>
      </div>
    )
  }

  const googleAccounts = accountsData?.google_accounts || []
  const microsoftAccounts = accountsData?.microsoft_accounts || []

  return (
    <div className="space-y-6">
      {/* Integration Cards */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">
          {/* Google Calendars */}
          <div className="bg-white/40 dark:bg-gradient-to-br dark:from-slate-800/70 dark:via-slate-800/50 dark:to-slate-900/60 backdrop-blur-md rounded-xl p-6 border border-white/30 dark:border-white/10 shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-white/60 dark:bg-white/15 rounded-xl shadow-sm dark:shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  <GoogleCalendarIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Google Calendar ({googleAccounts.length})</h3>
                  <p className="text-sm text-muted-foreground">Sync with Google Calendar</p>
                </div>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="neumorphic-button-primary"
              >
                <IconPlus className="w-3 h-3" />
                Add Google
              </Button>
            </div>

            {/* Connected Google Calendars */}
            {googleAccounts.length > 0 ? (
              [...googleAccounts]
                .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                .map((account) => renderAccountCard(account, "google"))
            ) : (
              <div className="p-4 text-center mt-4 bg-white/30 dark:bg-white/5 rounded-lg border border-white/20 dark:border-white/10">
                <p className="text-sm font-medium text-foreground">No Google calendars connected</p>
                <p className="text-xs text-muted-foreground mt-1">Connect your Google calendar to sync appointments</p>
              </div>
            )}
          </div>

          {/* Microsoft Calendars */}
          <div className="bg-white/40 dark:bg-gradient-to-br dark:from-slate-800/70 dark:via-slate-800/50 dark:to-slate-900/60 backdrop-blur-md rounded-xl p-6 border border-white/30 dark:border-white/10 shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-white/60 dark:bg-white/15 rounded-xl shadow-sm dark:shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  <MicrosoftCalendarIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Microsoft Outlook ({microsoftAccounts.length})</h3>
                  <p className="text-sm text-muted-foreground">Sync with Outlook Calendar</p>
                </div>
              </div>
              <Button
                onClick={() => setShowMicrosoftModal(true)}
                className="neumorphic-button-primary"
              >
                <IconPlus className="w-3 h-3" />
                Add Microsoft
              </Button>
            </div>

            {/* Connected Microsoft Calendars */}
            {microsoftAccounts.length > 0 ? (
              [...microsoftAccounts]
                .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                .map((account) => renderAccountCard(account, "microsoft"))
            ) : (
              <div className="p-4 text-center bg-white/30 dark:bg-white/5 rounded-lg border border-white/20 dark:border-white/10">
                <p className="text-sm font-medium text-foreground">No Microsoft calendars connected</p>
                <p className="text-xs text-gray-600 dark:text-white mt-1">Connect your Outlook calendar to sync appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Message */}
        <div className="w-fit mx-auto sm:mx-0 bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 p-3 sm:p-4 mt-6 rounded-lg whitespace-nowrap">
          <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200 text-center sm:text-left">
            ⚠️ Disconnecting will stop syncing appointments with that calendar
          </p>
        </div>
      </div>

      {/* Integration Modal - Google */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-sm mx-auto max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mx-auto mb-3">
                  <GoogleCalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold mb-2">Connect Google Calendar</h3>
                <p className="text-sm">
                  Allow access to sync your appointments with Google Calendar.
                </p>
              </div>

              <div className="w-full flex gap-3 pt-3">
                <Button
                  onClick={() => setShowModal(false)}
                  className="flex-1 neumorphic-button-destructive"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="flex-1 neumorphic-button-primary"
                >
                  {isConnecting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Google"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Microsoft Integration Modal */}
      {showMicrosoftModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          onClick={() => setShowMicrosoftModal(false)}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-sm mx-auto max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mx-auto mb-3">
                  <MicrosoftCalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold mb-2">Connect Microsoft Calendar</h3>
                <p className="text-sm">
                  Allow access to sync your appointments with Microsoft Outlook Calendar.
                </p>
              </div>

              <div className="w-full flex gap-3 pt-3">
                <Button
                  onClick={() => setShowMicrosoftModal(false)}
                  className="flex-1 neumorphic-button-destructive"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectMicrosoft}
                  disabled={isConnecting}
                  className="flex-1 neumorphic-button-primary"
                >
                  {isConnecting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Microsoft"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
