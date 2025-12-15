// /mnt/data/appointment-page.tsx
import { useState, useEffect } from "react"
import { IconChevronLeft, IconChevronRight, IconCalendar, IconUserCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { AuthStorage } from "@/api/auth"
import { DoctorAppointmentsAPI } from "@/api/doctor"
import { formatDateUS, getCurrentDateInNY, getCurrentDateStringInNY } from "@/lib/date"
import { getErrorMessage } from "@/lib/errors"



const sortAppointmentsByTime = (appointments: any[]) => {
  return [...appointments].sort((a, b) => {
    const timeA = new Date(a.appointment_time).getTime()
    const timeB = new Date(b.appointment_time).getTime()
    return timeA - timeB
  })
}

export function AppointmentPage() {
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(11)
  const [currentYear, setCurrentYear] = useState(2025)

  // API state
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track page load time to avoid premature logout on 401 errors
  const pageLoadStartTime = Date.now()

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Generate full calendar grid with proper day positioning
  const generateCalendarGrid = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

    const calendar: Array<any> = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      calendar.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        hasAppointments: false,
        appointments: []
      })
    }

    // Current month days
    const today = getCurrentDateInNY()
    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()

    for (let date = 1; date <= daysInMonth; date++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      const dayAppointments = Array.isArray(appointments) ? appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_time).toISOString().split('T')[0]
        return aptDate === dateStr
      }) : []
      const hasAppointments = dayAppointments.length > 0
      const isToday = isCurrentMonth && date === today.getDate()

      calendar.push({
        date,
        isCurrentMonth: true,
        isToday,
        hasAppointments,
        appointments: dayAppointments
      })
    }

    // Next month days to fill the grid
    const remainingCells = 42 - calendar.length // 6 weeks * 7 days
    for (let date = 1; date <= remainingCells; date++) {
      calendar.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasAppointments: false,
        appointments: []
      })
    }

    return calendar
  }

  // Get status styling based on appointment status (kept existing mapping)
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 neumorphic-inset'
      case 'in progress':
        return 'bg-yellow-100 neumorphic-inset'
      case 'scheduled':
        return 'bg-blue-100 neumorphic-inset'
      case 'cancelled':
        return 'bg-red-100 neumorphic-inset'
      default:
        return 'bg-muted neumorphic-inset'
    }
  }

  // Set today's date as default on component mount
  useEffect(() => {
    const today = getCurrentDateInNY()
    setSelectedDate(today.getDate())
    setCurrentMonth(today.getMonth() + 1)
    setCurrentYear(today.getFullYear())
  }, [])

  // Fetch appointments from API
  useEffect(() => {
    const fetchAppointments = async () => {
      // Add a delay to allow authentication validation to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        setLoading(true)
        setError(null)

        // Get user data to determine filtering
        const userData = AuthStorage.getUserData()
        const userType = AuthStorage.getUserType()

        // console.log('👤 User type:', userType, 'User data:', userData)

        let params = {}
        if (userType === 'doctor') {
          params = {
            doctor_id: userData?.id
          }
          // console.log('👨‍⚕️ Filtering appointments by doctor:', userData?.id)
        }

        const appointmentsData = await DoctorAppointmentsAPI.getAllAppointments(params)
        // console.log('📅 API response:', appointmentsData, 'Type:', typeof appointmentsData, 'Is array:', Array.isArray(appointmentsData))

        // Handle API response structure: { appointments: [...] }
        let appointmentsArray: any[] = []
        if (appointmentsData && typeof appointmentsData === 'object' && !Array.isArray(appointmentsData) && Array.isArray((appointmentsData as any).appointments)) {
          appointmentsArray = (appointmentsData as any).appointments
        } else if (Array.isArray(appointmentsData)) {
          appointmentsArray = appointmentsData
        } else {
          console.warn('Unexpected API response structure:', appointmentsData)
          appointmentsArray = []
        }

        setAppointments(appointmentsArray)
        // console.log('✅ Set appointments to:', appointmentsArray.length, 'items')
      } catch (err) {
        console.error('Failed to fetch appointments:', err)

        // Check if it's a 401 (token expired) error and handle logout
        // But don't logout immediately on page load to avoid issues with auth validation timing
        const pageLoadTime = Date.now() - pageLoadStartTime
        if (err && typeof err === 'object' && 'status' in err && err.status === 401 && pageLoadTime > 2000) {
          // console.log('🔐 Token expired, logging out user...')
          AuthStorage.clearAll()
          if (window.navigateToPage) {
            window.navigateToPage('login')
          }
          return // Don't show error, logout will redirect to login
        }

        // Also check for authentication error messages
        const errorMessage = err instanceof Error ? err.message : ''
        const pageLoadTime2 = Date.now() - pageLoadStartTime
        if ((errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('session has expired')) && pageLoadTime2 > 2000) {
          // console.log('🔐 Authentication error detected, redirecting to login...')
          AuthStorage.clearAll()
          if (window.navigateToPage) {
            window.navigateToPage('login')
          }
          return
        }

        setError(getErrorMessage(err))
        setAppointments([]) // Ensure we set an empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  const handleDateClick = (date: number, isCurrentMonth: boolean) => {
    if (isCurrentMonth) {
      setSelectedDate(date)
    }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const getTodaysAppointments = () => {
    const todayStr = getCurrentDateStringInNY() // YYYY-MM-DD format in NY timezone
    const todays = Array.isArray(appointments) ? appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_time).toISOString().split('T')[0]
      return aptDate === todayStr
    }) : []
    return sortAppointmentsByTime(todays)
  }

  const getSelectedDateAppointments = () => {
    if (!selectedDate) return []
    const selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    const selected = Array.isArray(appointments) ? appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_time).toISOString().split('T')[0]
      return aptDate === selectedDateStr
    }) : []
    return sortAppointmentsByTime(selected)
  }

  const isSelectedDatePast = () => {
    if (!selectedDate) return false
    const today = getCurrentDateInNY()
    today.setHours(0, 0, 0, 0)
    const selectedDateObj = new Date(currentYear, currentMonth - 1, selectedDate)
    selectedDateObj.setHours(0, 0, 0, 0)
    return selectedDateObj < today
  }

  const calendarGrid = generateCalendarGrid(currentMonth, currentYear)
  const todaysAppointments = getTodaysAppointments()
  const selectedDateAppointments = getSelectedDateAppointments()
  const isPastDate = isSelectedDatePast()

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6 px-4 lg:px-6 relative">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6 px-4 lg:px-6 relative">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <IconCalendar className="w-12 h-12 mx-auto mb-2" />
              <p className="font-medium">Failed to load appointments</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-6 px-4 lg:px-6 relative"
    >
      {/* Welcome Banner */}
      <div className="">
        <span className="text-base sm:text-lg font-regular">
          Welcome,{" "}
          <span className="font-bold">
            {(() => {
              const userData = AuthStorage.getUserData()
              if (userData) {
                const name = userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
                const title = userData.department ? `Dr. ${name}` : name
                return title || 'User'
              }
              return 'User'
            })()}
          </span>
        </span>
      </div>

      {/* Today's Appointments Section */}
      <div
        className="-mt-1 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div
          >
            <IconCalendar className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold">Today's Appointments ({todaysAppointments.length})</h2>
        </div>

        {todaysAppointments.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {todaysAppointments.map((apt: any, index: number) => (
              <div
                key={index}
                className="neumorphic-inset p-3 md:p-4 rounded-lg neumorphic-hover cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium text-sm">
                        {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-muted/50" />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{apt.patient_name}</span>
                      {/* <p className="text-xs font-medium">Patient ID: {apt.patient_id}</p> */}
                      <p className="text-xs font-medium">{apt.doctor_name}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(apt.status)}`}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="neumorphic-inset p-6 rounded-lg text-center"
          >
            <div
            >
              <IconCalendar className="w-10 h-10 mx-auto mb-3" />
            </div>
            <p
              className=""
            >
              No appointments scheduled for today
            </p>
          </div>
        )}
      </div>

      {/* Calendar Section */}
      <div
      >
        {/* Header */}
        <div
          className="mb-2"
        >
          <h1 className="text-lg md:text-xl font-semibold text-foreground">
            {selectedDate && isPastDate ? "Past Appointments" : "Future Appointments"}
          </h1>
        </div>

        {/* Bento Grid Layout - Calendar and Appointments Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100%-4rem)]">
          {/* Appointments Table */}
          <div
            className="col-span-12 md:col-span-8 lg:col-span-8 xl:col-span-8 flex flex-col"
          >
            {/* Selected Date Appointments */}
            {selectedDate ? (
              <div
                className="flex-1 flex flex-col"
                key={selectedDate}
              >
                <div
                  className="flex items-center justify-between mb-3"
                >
                  <h2 className="text-sm md:text-lg font-semibold text-foreground">
                    {formatDateUS(new Date(currentYear, currentMonth - 1, selectedDate))}
                  </h2>
                  <span
                    className="text-sm"
                  >
                    {selectedDateAppointments.length > 0
                      ? `${selectedDateAppointments.length} appointments`
                      : 'No appointments'
                    }
                  </span>
                </div>

                {selectedDateAppointments.length > 0 ? (
                  <div
                    className="neumorphic-inset rounded-lg p-4 border-0 flex flex-col"
                  >
                    <div className="overflow-x-auto flex-1">
                      <div className="max-h-[80vh] overflow-y-auto bg-card rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 z-10 bg-card">
                            <tr className="border-b-2 border-muted/90 bg-muted/10">
                              <th className="text-left font-medium py-3 px-2">Time</th>
                              <th className="text-left font-medium py-3 px-2">Patient</th>
                              <th className="text-left font-medium py-3 px-2">Doctor</th>
                              <th className="text-left font-medium py-3 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-muted/90">
                            {selectedDateAppointments.map((apt: any, index: number) => (
                              <tr key={index} className="hover:bg-muted/30 transition-colors">
                                <td className="py-3 px-2 font-medium text-sm">
                                  {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-1">
                                    <IconUserCircle className="w-5 h-5" />
                                    <span className="font-medium text-sm">{apt.patient_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-sm">{apt.doctor_name}</td>
                                <td className="py-3 px-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(apt.status)}`}
                                  >
                                    {apt.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="neumorphic-inset rounded-lg p-8 border-0 flex flex-col items-center justify-center text-center"
                  >
                    <div>
                      <IconCalendar className="w-12 h-12 mb-4" />
                    </div>
                    <h3
                      className="text-lg font-medium text-foreground mb-2"
                    >
                      No Appointments Scheduled
                    </h3>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center"
              >
                <div
                  className="neumorphic-inset rounded-lg p-8 border-0 flex flex-col items-center justify-center text-center max-w-md"
                >
                  <div
                  >
                    <IconCalendar className="w-16 h-16 mb-4" />
                  </div>
                  <h3
                    className="text-xl font-semibold text-foreground mb-2"
                  >
                    Select a Date
                  </h3>
                  <p
                    className="text-sm"
                  >
                    Choose a date from the calendar to view and manage appointments for that day.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Calendar Component */}
          <div
            className="col-span-12 md:col-span-4 lg:col-span-4 xl:col-span-4 w-full"
          >
            {/* Calendar Content */}
            <div
              className="p-1.5 sm:p-2 md:p-3 items-center justify-center neumorphic-pressed rounded-lg overflow-hidden w-full min-h-[240px] sm:min-h-[280px] md:min-h-[320px] flex flex-col"
            >
              <div
                className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2 px-6 w-full justify-center"
              >
                <div
                >
                  <Button
                    onClick={handlePrevMonth}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  >
                    <IconChevronLeft className="w-3 h-3" />
                  </Button>
                </div>
                <h1
                  key={`${currentMonth}-${currentYear}`}
                  className="text-xs sm:text-sm md:text-base font-semibold flex-1 text-center"
                >
                  {months[currentMonth - 1]} {currentYear}
                </h1>
                <div
                >
                  <Button
                    onClick={handleNextMonth}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  >
                    <IconChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col w-full">
                {/* Day Headers */}
                <div
                  className="grid grid-cols-7 gap-0.5 sm:gap-0.5 px-6 w-full"
                >
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] sm:text-xs font-medium neumorphic-inset px-0.5 py-0.5 sm:py-1 rounded min-w-0"
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div
                  key={`${currentMonth}-${currentYear}`}
                  className="grid grid-cols-7 gap-0.5 sm:gap-0.5 p-5 flex-1 w-full auto-rows-fr"
                >
                  {calendarGrid.map((day, index) => (
                    <div
                      key={index}
                      onClick={() => day.isCurrentMonth ? handleDateClick(day.date, day.isCurrentMonth) : undefined}
                      className={`
                          calendar-cell relative rounded-lg cursor-pointer
                          w-full min-h-0 flex flex-col justify-center items-center
                          ${day.isCurrentMonth
                          ? selectedDate === day.date
                            ? 'neumorphic-pressed shadow-inner border-1 border-primary'
                            : 'neumorphic'
                          : 'neumorphic-inset opacity-50 cursor-not-allowed'
                        }
                          ${day.isToday && day.isCurrentMonth ? 'ring-2 ring-primary ring-inset' : ''}
                        `}
                      style={{ aspectRatio: '1' }}
                    >
                      <div
                        className={`
                            text-sm font-bold text-center leading-tight
                            ${day.isCurrentMonth
                            ? selectedDate === day.date
                              ? 'font-bold'
                              : day.isToday
                                ? 'font-bold'
                                : ''
                            : ''
                          }
                          `}
                      >
                        {day.date}
                      </div>

                      {/* Show appointment count badge */}
                      {day.appointments.length > 0 && day.isCurrentMonth && (
                        <div className="-mt-0.5">
                          <div
                            className={`appointment-badge inline-flex items-center justify-center text-[8px] sm:text-[10px] font-medium rounded-full px-0.5 sm:px-1 neumorphic-inset bg-primary/10 border border-primary/20`}
                          >
                            {day.appointments.length}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
