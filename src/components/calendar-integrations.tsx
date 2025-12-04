import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import data from "@/data.json"

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

export function CalendarIntegrations() {
  const { calendarIntegrations } = data
  const [showModal, setShowModal] = useState(false)
  const [showMicrosoftModal, setShowMicrosoftModal] = useState(false)

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
                  <h3 className="text-lg font-semibold">{calendarIntegrations.google.name} ({calendarIntegrations.google.count})</h3>
                  <p className="text-sm text-muted-foreground">{calendarIntegrations.google.description}</p>
                </div>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
              >
                <IconPlus className="w-3 h-3" />
                Add Google
              </Button>
            </div>

            {/* Connected Calendar */}
            {calendarIntegrations.google.connectedCalendars.map((calendar, index) => (
              <div key={index} className="">
                <div className="flex items-center justify-between my-4">
                  <div className="flex items-center gap-3">
                    
                    <div>
                      <p className="text-sm text-muted-foreground">{calendar.email}</p>
                      <div className="text-sm text-muted-foreground">
                        Connected: {calendar.connectedDate}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium neumorphic-inset text-primary">
                    {calendar.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Microsoft Calendars */}
          <div className="neumorphic-pressed p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <MicrosoftCalendarIcon className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-semibold">{calendarIntegrations.microsoft.name} ({calendarIntegrations.microsoft.count})</h3>
                  <p className="text-sm text-gray-600">{calendarIntegrations.microsoft.description}</p>
                </div>
              </div>
              <Button
                onClick={() => setShowMicrosoftModal(true)}
                className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
              >
                <IconPlus className="w-3 h-3" />
                Add Microsoft
              </Button>
            </div>

            {/* Connected Microsoft Calendars or Empty State */}
            {calendarIntegrations.microsoft.connectedCalendars.length > 0 ? (
              calendarIntegrations.microsoft.connectedCalendars.map((calendar: any, index: number) => (
                <div key={index} className="p-4">
                  <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-3">
                      <MicrosoftCalendarIcon className="w-8 h-8" />
                      <div>
                        <p className="text-sm text-gray-600">{calendar.email}</p>
                        <div className="text-sm text-gray-600">
                          Connected: {calendar.connectedDate}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {calendar.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-center">
                <p className="text-muted-foreground text-sm p-1">No Microsoft calendars connected</p>
                <p className="text-muted-foreground text-xs">Connect your Outlook calendar to sync appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Message */}
        <div className="neumorphic-inset p-4 mt-6">
          <p className="text-sm font-medium text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                  Allow access to sync your appointments with Google Calendar.
                </p>
              </div>

              <div className="w-full flex gap-3 pt-3">
                <Button
                  onClick={() => setShowModal(false)}
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:bg-destructive hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Connect Google
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
                <p className="text-sm text-muted-foreground">
                  Allow access to sync your appointments with Microsoft Outlook Calendar.
                </p>
              </div>

              <div className="w-full flex gap-3 pt-3">
                <Button
                  onClick={() => setShowMicrosoftModal(false)}
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:bg-destructive hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  Connect Microsoft
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
