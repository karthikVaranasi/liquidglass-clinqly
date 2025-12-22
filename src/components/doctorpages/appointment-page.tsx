// /mnt/data/appointment-page.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { IconChevronLeft, IconChevronRight, IconCalendar, IconUserCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { AuthStorage } from "@/api/auth"
import { useAuth } from "@/hooks/use-auth"
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
  const navigate = useNavigate()
  const { role, userId, doctor } = useAuth()
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

  // Get status styling based on appointment status (liquid glass badges)
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-400/30 backdrop-blur-sm'
      case 'in progress':
        return 'bg-amber-100/60 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/30 backdrop-blur-sm'
      case 'scheduled':
        return 'bg-blue-100/60 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300/40 dark:border-blue-400/30 backdrop-blur-sm'
      case 'cancelled':
        return 'bg-rose-100/60 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300/40 dark:border-rose-400/30 backdrop-blur-sm'
      default:
        return 'bg-slate-100/60 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-400/30 backdrop-blur-sm'
    }
  }

  // Get card status styling for transparency and visibility
  const getCardStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-50/5 dark:bg-blue-500/5 border-blue-400/40 dark:border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
      case 'cancelled':
        return 'bg-rose-50/5 dark:bg-rose-500/5 border-rose-400/40 dark:border-rose-400/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
      case 'completed':
        return 'bg-emerald-50/5 dark:bg-emerald-500/5 border-emerald-400/30 dark:border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
      case 'in progress':
        return 'bg-amber-50/5 dark:bg-amber-500/5 border-amber-400/40 dark:border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
      default:
        return 'bg-white/5 border-white/20'
    }
  }

  // Set next day's date as default on component mount (today handled separately above)
  useEffect(() => {
    const today = getCurrentDateInNY()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    setSelectedDate(tomorrow.getDate())
    setCurrentMonth(tomorrow.getMonth() + 1)
    setCurrentYear(tomorrow.getFullYear())
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
        // console.log('👤 User type:', role, 'User ID:', userId)

        let params = {}
        if (role === 'doctor') {
          params = {
            doctor_id: userId
          }
          // console.log('👨‍⚕️ Filtering appointments by doctor:', userId)
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

    if (role && userId) {
      fetchAppointments()
    }
  }, [role, userId])

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

  // Check if selected date is in the past
  const isSelectedDateInPast = () => {
    if (!selectedDate) return false
    const selectedDateObj = new Date(currentYear, currentMonth - 1, selectedDate)
    const today = getCurrentDateInNY()
    // Reset time to start of day for accurate date comparison
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const selectedStartOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate())
    return selectedStartOfDay < todayStartOfDay
  }


  const handleAppointmentCardClick = (appointment: any) => {
    // Navigate to patients page with patient ID to show profile, indicating we came from appointments
    navigate(`/doctor/patients?patient=${appointment.patient_id}&from=appointments`)
  }

  // Helper function to check if appointment is in morning (before 1 PM)
  const isMorningAppointment = (appointmentTime: string) => {
    const hour = new Date(appointmentTime).getHours()
    return hour < 13
  }


  const calendarGrid = generateCalendarGrid(currentMonth, currentYear)
  const todaysAppointments = getTodaysAppointments()
  const selectedDateAppointments = getSelectedDateAppointments()

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

      {/* Today's Appointments Section */}
      <div
        className="-mt-1 space-y-4"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold">Today's Appointments ({todaysAppointments.length})</h2>
        </div>

        {todaysAppointments.length > 0 ? (
          <div className="space-y-4">
            {/* Appointments Grid - responsive: 1 per row on small, 2 on medium, 3 on large screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysAppointments.map((apt: any, index: number) => {
                const isMorning = isMorningAppointment(apt.appointment_time)

                // Consistent liquid glass style matching the table below
                // Using liquid-glass class, primary border, and cyan glow

                return (
                  <div
                    key={index}
                    className={`p-5 transition-all duration-300 cursor-pointer rounded-2xl backdrop-blur-sm border ${getCardStatusStyle(apt.status)} hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 relative overflow-hidden group`}
                    onClick={() => handleAppointmentCardClick(apt)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleAppointmentCardClick(apt)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View profile for ${apt.patient?.first_name} ${apt.patient?.last_name}`}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Time */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">
                          {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusStyle(apt.status)}`}
                        >
                          {apt.status}
                        </span>
                      </div>
                      {/* Patient Name */}
                      <div className="font-bold text-lg">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </div>
                      {/* Reason */}
                      <p className="text-sm text-foreground/90 font-medium truncate relative z-10">
                        {apt.reason_for_visit || "No reason provided"}
                      </p>

                      {/* Glass Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        ) : (
          <div
            className="liquid-glass p-6 rounded-xl text-center"
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
            {isSelectedDateInPast() ? 'Past Appointments' : 'Scheduled Appointments'}
          </h1>
        </div>

        {/* Bento Grid Layout - Calendar and Appointments Table */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100%-4rem)]">
          {/* Appointments Table */}
          <div
            className="order-2 md:order-1 col-span-12 md:col-span-7 lg:col-span-8 flex flex-col"
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
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex flex-col"
                  >
                    <div className="overflow-hidden rounded-xl flex-1 flex flex-col">
                      {/* Fixed Header */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left font-bold py-3 px-2 text-foreground">Time</th>
                            <th className="text-left font-bold py-3 px-2 text-foreground">Patient</th>
                            <th className="text-left font-bold py-3 px-2 text-foreground">Reason for Visit</th>
                            <th className="text-left font-bold py-3 px-2 text-foreground">Doctor</th>
                            <th className="text-left font-bold py-3 px-2 text-foreground">Status</th>
                          </tr>
                        </thead>
                      </table>
                      {/* Scrollable Body */}
                      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto flex-1">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-white/10">
                            {selectedDateAppointments.map((apt: any, index: number) => (
                              <tr
                                key={index}
                                className="bg-transparent hover:bg-white/10 transition-colors cursor-pointer"
                                onClick={() => handleAppointmentCardClick(apt)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleAppointmentCardClick(apt)
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`View profile for ${apt.patient?.first_name} ${apt.patient?.last_name}`}
                              >
                                <td className="py-3 px-2 font-bold text-sm text-foreground">
                                  {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-1 text-foreground">
                                    <IconUserCircle className="w-5 h-5 text-foreground/80" />
                                    <span className="font-bold text-sm">{apt.patient?.first_name} {apt.patient?.last_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-foreground/90 font-medium">
                                  <span className="truncate block">
                                    {apt.reason_for_visit || "No reason provided"}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-sm text-foreground">{apt.doctor?.name}</td>
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
                    className="liquid-glass rounded-xl p-8 border-0 flex flex-col items-center justify-center text-center"
                  >
                    <div className="text-muted-foreground">
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
                className="flex-1 flex flex-col"
              >
                <div
                  className="liquid-glass rounded-xl p-8 border-0 flex flex-col items-center justify-center text-center"
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
            className="order-1 md:order-2 col-span-12 md:col-span-5 lg:col-span-4 w-full max-w-md md:max-w-none mx-auto md:mx-0"
          >
            {/* Calendar Content */}
            <div
              className="p-2 sm:p-3 md:p-3 items-center justify-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] overflow-hidden w-full min-h-[240px] sm:min-h-[260px] md:min-h-[280px] flex flex-col"
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
                  className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-1 px-2 sm:px-4 md:px-3 w-full"
                >
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] sm:text-xs md:text-[11px] font-medium text-muted-foreground px-0.5 py-0.5 sm:py-1 rounded min-w-0"
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div
                  key={`${currentMonth}-${currentYear}`}
                  className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-1 p-2 sm:p-4 md:p-3 flex-1 w-full auto-rows-fr"
                >
                  {calendarGrid.map((day, index) => (
                    <div
                      key={index}
                      onClick={() => day.isCurrentMonth ? handleDateClick(day.date, day.isCurrentMonth) : undefined}
                      className={`
                          calendar-cell relative rounded-lg cursor-pointer
                          w-full min-h-0 flex flex-col justify-center items-center transition-all duration-300
                          ${day.isCurrentMonth
                          ? selectedDate === day.date
                            ? 'bg-primary text-white shadow-lg ring-2 ring-primary scale-110 z-10'
                            : day.isToday
                              ? 'bg-white ring-2 ring-primary text-black'
                              : day.hasAppointments
                                ? 'bg-white hover:scale-105 text-black shadow-sm'
                                : 'bg-white/90 hover:bg-white text-black'
                          : 'bg-white/40 opacity-40 cursor-not-allowed text-gray-500'
                        }
                        `}
                      style={{ aspectRatio: '1' }}
                    >
                      <div
                        className={`
                            font-semibold text-center leading-tight transition-all duration-300
                            ${day.isCurrentMonth && selectedDate === day.date ? 'text-white text-base' : 'text-black text-sm'}
                          `}
                      >
                        {day.date}
                      </div>

                      {/* Show appointment count badge */}
                      {day.appointments.length > 0 && day.isCurrentMonth && (
                        <div className="-mt-0.5">
                          <div
                            className={`appointment-badge inline-flex items-center justify-center text-[8px] sm:text-[10px] font-medium rounded-full px-0.5 sm:px-1 ${selectedDate === day.date
                              ? 'bg-white/20 text-white border border-white/50'
                              : 'bg-primary/20 dark:bg-primary/40 text-primary dark:text-white border border-primary/30'
                              }`}
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
