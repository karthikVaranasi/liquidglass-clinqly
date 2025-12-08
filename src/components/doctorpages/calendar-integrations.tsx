import { useState, useEffect } from "react"
import { IconPlus, IconLoader2, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { AuthStorage } from "@/api/auth"
import { CalendarAPI } from "@/api/doctor"
import type { CalendarAccount, CalendarAccountsResponse } from "@/api/doctor"

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
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null)
  // NOTE: settingPrimaryId is for handleSetPrimary which is commented out for now
  // const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null)

  // Get doctor ID from storage
  const userData = AuthStorage.getUserData()
  const doctorId = userData?.id

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

  // Handle disconnect account
  const handleDisconnect = async (accountId: number, provider: 'google' | 'microsoft') => {
    if (!doctorId) return

    setDisconnectingId(accountId)

    try {
      await CalendarAPI.disconnectAccount(doctorId, accountId, provider)

      // Update local state
      if (accountsData) {
        const updatedData = { ...accountsData }
        if (provider === 'google') {
          updatedData.google_accounts = updatedData.google_accounts.filter(a => a.id !== accountId)
        } else {
          updatedData.microsoft_accounts = updatedData.microsoft_accounts.filter(a => a.id !== accountId)
        }
        updatedData.total_accounts = updatedData.google_accounts.length + updatedData.microsoft_accounts.length
        setAccountsData(updatedData)
      }

      toast.success(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar disconnected`)
    } catch (error) {
      console.error("Failed to disconnect:", error)
      toast.error("Failed to disconnect calendar")
    } finally {
      setDisconnectingId(null)
    }
  }

  // NOTE: handleSetPrimary function preserved for future use but commented out
  // to prevent unused variable build errors
  /*
  const handleSetPrimary = async (accountId: number, provider: 'google' | 'microsoft') => {
    if (!doctorId) return

    setSettingPrimaryId(accountId)

    try {
      await CalendarAPI.setPrimaryAccount(doctorId, accountId, provider)

      // Update local state
      if (accountsData) {
        const updatedData = { ...accountsData }
        if (provider === 'google') {
          updatedData.google_accounts = updatedData.google_accounts.map(a => ({
            ...a,
            is_primary: a.id === accountId,
          }))
        } else {
          updatedData.microsoft_accounts = updatedData.microsoft_accounts.map(a => ({
            ...a,
            is_primary: a.id === accountId,
          }))
        }
        setAccountsData(updatedData)
      }

      toast.success("Primary calendar updated")
    } catch (error) {
      console.error("Failed to set primary:", error)
      toast.error("Failed to set primary calendar")
    } finally {
      setSettingPrimaryId(null)
    }
  }
  */

  // Render account card
  const renderAccountCard = (account: CalendarAccount, provider: 'google' | 'microsoft') => (
    <div key={account.id} className="flex items-center justify-between my-4 p-3 neumorphic-inset rounded-lg">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">{account.email}</p>
          <div className="text-xs text-muted-foreground">
            Connected: {formatDate(account.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">

        {/* Status badge */}
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium neumorphic-inset ${account.is_valid ? 'text-green-600' : 'text-red-600'
          }`}>
          {account.is_valid ? 'Connected' : 'Expired'}
        </span>

        {/* Disconnect button */}
        <Button
          onClick={() => handleDisconnect(account.id, provider)}
          disabled={disconnectingId === account.id}
          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-2 py-1"
          title="Disconnect"
        >
          {disconnectingId === account.id ? (
            <IconLoader2 className="w-4 h-4 animate-spin" />
          ) : (
            <IconTrash className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm">Loading calendar integrations...</span>
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
          <div className="neumorphic-pressed p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GoogleCalendarIcon className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-semibold">Google Calendar ({googleAccounts.length})</h3>
                  <p className="text-sm">Sync with Google Calendar</p>
                </div>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
              >
                <IconPlus className="w-3 h-3" />
                Add Google
              </Button>
            </div>

            {/* Connected Google Calendars */}
            {googleAccounts.length > 0 ? (
              googleAccounts.map((account) => renderAccountCard(account, 'google'))
            ) : (
              <div className="p-4 text-center mt-4 neumorphic-inset rounded-lg">
                <p className="text-sm">No Google calendars connected</p>
                <p className="text-xs text-muted-foreground">Connect your Google calendar to sync appointments</p>
              </div>
            )}
          </div>

          {/* Microsoft Calendars */}
          <div className="neumorphic-pressed p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <MicrosoftCalendarIcon className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-semibold">Microsoft Outlook ({microsoftAccounts.length})</h3>
                  <p className="text-sm">Sync with Outlook Calendar</p>
                </div>
              </div>
              <Button
                onClick={() => setShowMicrosoftModal(true)}
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
              >
                <IconPlus className="w-3 h-3" />
                Add Microsoft
              </Button>
            </div>

            {/* Connected Microsoft Calendars */}
            {microsoftAccounts.length > 0 ? (
              microsoftAccounts.map((account) => renderAccountCard(account, 'microsoft'))
            ) : (
              <div className="p-4 text-center neumorphic-inset rounded-lg">
                <p className="text-sm">No Microsoft calendars connected</p>
                <p className="text-xs text-muted-foreground">Connect your Outlook calendar to sync appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Message */}
        <div className="neumorphic-inset p-4 mt-6 rounded-lg">
          <p className="text-sm font-medium">
            Disconnecting will stop syncing appointments with that calendar
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
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectMicrosoft}
                  disabled={isConnecting}
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
