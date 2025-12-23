// /mnt/data/appointment-page.tsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { IconChevronLeft, IconChevronRight, IconCalendar, IconUserCircle, IconCaretRight } from "@tabler/icons-react"
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

  // Carousel ref for scrolling
  const carouselRef = useRef<HTMLDivElement>(null)

  // API state
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track page load time to avoid premature logout on 401 errors
  const pageLoadStartTime = Date.now()

  // Scroll carousel left
  const scrollCarouselLeft = () => {
    if (carouselRef.current) {
      const cardWidth = 250 // approx width of card + gap
      carouselRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' })
    }
  }

  // Scroll carousel right
  const scrollCarouselRight = () => {
    if (carouselRef.current) {
      const cardWidth = 250 // approx width of card + gap
      carouselRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' })
    }
  }

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
      case 'scheduled':
        return 'bg-transparent text-blue-600 dark:text-blue-400 border-2 border-blue-500 dark:border-blue-400'
      case 'cancelled':
        return 'bg-transparent text-rose-600 dark:text-rose-400 border-2 border-rose-500 dark:border-rose-400'
      case 'completed':
        return 'bg-transparent text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 dark:border-emerald-400'
      case 'in progress':
        return 'bg-transparent text-amber-600 dark:text-amber-400 border-2 border-amber-500 dark:border-amber-400'
      default:
        return 'bg-transparent text-slate-600 dark:text-slate-400 border-2 border-slate-400 dark:border-slate-500'
    }
  }

  // Get card status styling for liquid glass theme with user-specified colors
  const getCardStatusStyle = (status: string) => {
    // Cards use #dfe2f3 background with glass effects
    const baseGlass = 'bg-[#dfe2f3] dark:bg-[#3a4057] backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(100,150,200,0.15),inset_0_0_20px_rgba(255,255,255,0.3)]'
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return `${baseGlass} border-blue-300/60`
      case 'cancelled':
        return `${baseGlass} border-rose-300/60`
      case 'completed':
        return `${baseGlass} border-emerald-300/60`
      case 'in progress':
        return `${baseGlass} border-amber-300/60`
      default:
        return `${baseGlass} border-white/40`
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
      className="space-y-6 px-4 lg:px-6 relative bg-transparent"
    >

      {/* Today's Appointments Section - Colored Glass with Blue Neon Border */}
      <div
        className="relative -mt-1 space-y-4 bg-gradient-to-br from-[#91b4e8]/80 to-[#a7c4f0]/60 dark:from-[#3a4a5a]/80 dark:to-[#4a5a6a]/60 rounded-2xl p-4 backdrop-blur-xl border-2 border-[#7eb8f0]/50 dark:border-[#5a7a9a]/50 shadow-[0_0_20px_rgba(126,184,240,0.3),0_8px_32px_rgba(100,150,200,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_0_20px_rgba(80,120,160,0.3),0_8px_32px_rgba(50,80,120,0.2)] glass-shine"
      >
        {/* Glossy Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-lg md:text-xl font-semibold text-white dark:text-white drop-shadow-sm">Today's Appointments ({todaysAppointments.length})</h2>
        </div>

        {todaysAppointments.length > 0 ? (
          <div className="relative z-10">
            {/* Appointments Grid - Responsive Layout */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-1"
            >
              {todaysAppointments.map((apt: any, index: number) => {
                const isMorning = isMorningAppointment(apt.appointment_time)

                return (
                  <div
                    key={index}
                    className="p-3 transition-all duration-300 cursor-pointer rounded-xl bg-white/80 dark:bg-white/20 backdrop-blur-xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50 relative overflow-hidden group h-[120px] flex flex-col justify-between"
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
                    <div className="flex flex-col gap-1 relative z-10 h-full">
                      {/* Row 1: Time & Patient */}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-gradient-to-r from-[#d4e4f7] to-[#e8f0f8] dark:from-[#4a5a7a] dark:to-[#5a6a8a] text-xs font-bold text-gray-700 dark:text-white shadow-sm flex-shrink-0">
                          {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-sm text-gray-800 dark:text-white truncate">
                          {apt.patient?.first_name} {apt.patient?.last_name}
                        </span>
                      </div>

                      {/* Row 2: Reason */}
                      <div className="flex-1 min-h-0 mt-3">
                        <p className="text-sm text-black dark:text-white truncate w-full" title={apt.reason_for_visit}>
                          {apt.reason_for_visit || "No Reason Provided"}
                        </p>
                      </div>

                      {/* Row 3: Age & Status */}
                      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-200/50 dark:border-white/10">
                        <span className="px-2 py-0.5 text-xs font-bold text-gray-700 dark:text-white bg-gradient-to-r from-[#f5d4a8]/80 to-[#f8e4c8]/60 dark:from-[#a87832]/60 dark:to-[#c99a4a]/40 rounded-md shadow-sm">
                          {apt.patient?.dob ? `${Math.floor((new Date().getTime() - new Date(apt.patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years` : '--'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusStyle(apt.status)}`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>

                    {/* Glossy Top Highlight */}
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-t-xl pointer-events-none" />

                    {/* Glass Shine Effect on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
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
            {isSelectedDateInPast() ? 'Past Appointments' : 'Scheduled Appointments'} ({selectedDateAppointments?.length || 0})
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


                {selectedDateAppointments.length > 0 ? (
                  <div
                    className="relative bg-gradient-to-br from-[#9a8ea2]/80 to-[#b0a4b2]/60 dark:from-[#4a4257]/80 dark:to-[#5a5267]/60 backdrop-blur-xl rounded-xl p-4 border-[3px] border-[#e8a855]/70 dark:border-[#a87832]/60 shadow-[0_0_30px_rgba(232,168,85,0.5),0_0_60px_rgba(232,168,85,0.2),0_8px_32px_rgba(150,130,160,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_0_20px_rgba(168,120,50,0.4),0_8px_32px_rgba(50,40,60,0.3)] flex flex-col overflow-hidden glass-shine"
                  >
                    {/* Glossy Top Highlight */}
                    <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/25 via-white/10 to-transparent dark:from-white/15 dark:via-white/8 dark:to-transparent rounded-t-xl pointer-events-none" />

                    <div className="overflow-hidden rounded-xl flex-1 flex flex-col relative z-10">
                      {/* Fixed Header */}
                      <table className="w-full text-sm">
                        <thead className="bg-[#9a8ea2] dark:bg-[#4a4257]">
                          <tr>
                            <th className="text-left font-bold text-base py-3 px-4 text-white w-[15%]">Time</th>
                            <th className="text-left font-bold text-base py-3 px-4 text-white w-[22%]">Patient</th>
                            <th className="text-left font-bold text-base py-3 px-4 text-white w-[28%]">Reason for Visit</th>
                            <th className="text-left font-bold text-base py-3 px-4 text-white w-[20%]">Doctor</th>
                            <th className="text-left font-bold text-base py-3 px-4 text-white w-[15%]">Status</th>
                          </tr>
                        </thead>
                      </table>
                      {/* Scrollable Body */}
                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto flex-1 bg-white/80 dark:bg-white/20 rounded-lg">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-[#9a8ea2]/30">
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
                                <td className="py-3 px-4 text-sm text-black dark:text-white w-[15%]">
                                  {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 px-4 w-[22%]">
                                  <div className="flex items-center gap-2 text-black dark:text-white">
                                    <IconUserCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    <span className="text-sm">{apt.patient?.first_name} {apt.patient?.last_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-black dark:text-white font-medium w-[28%]">
                                  <span className="truncate block">
                                    {apt.reason_for_visit || "No reason provided"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-black dark:text-white w-[20%]">{apt.doctor?.name}</td>
                                <td className="py-3 px-4 w-[15%]">
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
              className="relative p-2 sm:p-3 md:p-3 items-center justify-center bg-gradient-to-br from-[#d7d7f3]/80 to-[#e5e5f8]/60 dark:from-[#3a3a57]/90 dark:to-[#4a4a67]/70 backdrop-blur-xl rounded-xl border-2 border-[#b8a0d4]/50 shadow-[0_0_20px_rgba(184,160,212,0.3),0_8px_32px_rgba(200,200,240,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] overflow-hidden w-full min-h-[240px] sm:min-h-[260px] md:min-h-[280px] flex flex-col glass-shine"
            >
              {/* Glossy Top Highlight */}
              <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-xl pointer-events-none" />
              <div
                className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2 px-6 w-full justify-center"
              >
                <div
                >
                  <Button
                    onClick={handlePrevMonth}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-white/50 dark:bg-white/20 border-gray-300 dark:border-white/30 hover:bg-white/80 dark:hover:bg-white/30"
                  >
                    <IconChevronLeft className="w-3 h-3 text-gray-700 dark:text-white" />
                  </Button>
                </div>
                <h1
                  key={`${currentMonth}-${currentYear}`}
                  className="text-xs sm:text-sm md:text-base font-semibold flex-1 text-center text-gray-800 dark:text-white"
                >
                  {months[currentMonth - 1]} {currentYear}
                </h1>
                <div
                >
                  <Button
                    onClick={handleNextMonth}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-white/50 dark:bg-white/20 border-gray-300 dark:border-white/30 hover:bg-white/80 dark:hover:bg-white/30"
                  >
                    <IconChevronRight className="w-3 h-3 text-gray-700 dark:text-white" />
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
                      className="text-center text-[10px] sm:text-xs md:text-[11px] font-medium dark:font-bold text-muted-foreground dark:text-white px-0.5 py-0.5 sm:py-1 rounded min-w-0"
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
                            ? 'bg-[#5a8ac7] text-white shadow-lg ring-2 ring-[#5a8ac7] scale-110 z-10'
                            : day.isToday
                              ? 'bg-white ring-2 ring-[#5a8ac7] text-black'
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
                              ? 'bg-white/40 text-white border border-white/50'
                              : 'bg-[#5a8ac7]/20 text-[#3a6a9a] border border-[#5a8ac7]/40'
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
