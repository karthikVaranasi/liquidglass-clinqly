// /mnt/data/appointment-page.tsx
import { useState, useEffect } from "react"
import { IconChevronLeft, IconChevronRight, IconCalendar, IconUserCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import data from "@/data.json"
import { formatDateUS } from "@/lib/date"

// Optimized animation variants for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Reduced stagger delay
      delayChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 }, // Reduced y offset
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 } // Faster duration
  }
}


const staggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03, // Much faster stagger
      delayChildren: 0.05
    }
  }
}

const statusBadgeVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02, // Reduced scale
    transition: { duration: 0.15 } // Faster transition
  },
  pulse: {
    scale: [1, 1.05, 1], // Reduced scale range
    transition: { duration: 1.5, repeat: Infinity } // Slower pulse
  }
}

const calendarVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100, // Reduced movement
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 100 : -100, // Reduced movement
    opacity: 0
  })
}

// Helper to parse "hh:mm AM/PM" into minutes since midnight for sorting
const parseTimeToMinutes = (timeStr: string) => {
  if (!timeStr) return Number.MAX_SAFE_INTEGER

  const [timePart, modifierRaw] = timeStr.split(" ")
  if (!timePart) return Number.MAX_SAFE_INTEGER

  const modifier = modifierRaw?.toUpperCase()
  const [h, m] = timePart.split(":")
  let hours = Number(h)
  const minutes = Number(m ?? 0)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER
  }

  if (modifier === "PM" && hours !== 12) {
    hours += 12
  } else if (modifier === "AM" && hours === 12) {
    hours = 0
  }

  return hours * 60 + minutes
}

const sortAppointmentsByTime = (appointments: any[]) => {
  return [...appointments].sort((a, b) => {
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  })
}

export function AppointmentPage() {
  const { appointmentsByDate } = data
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(11)
  const [currentYear, setCurrentYear] = useState(2025)
  const [direction, setDirection] = useState(0)

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
    const today = new Date()
    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()

    for (let date = 1; date <= daysInMonth; date++) {
      const dateKey = `${year}-${month}-${date}`
      const appointments = appointmentsByDate[dateKey as keyof typeof appointmentsByDate] || []
      const hasAppointments = appointments.length > 0
      const isToday = isCurrentMonth && date === today.getDate()

      calendar.push({
        date,
        isCurrentMonth: true,
        isToday,
        hasAppointments,
        appointments
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
        return 'bg-green-100 text-green-800 neumorphic-inset'
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 neumorphic-inset'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 neumorphic-inset'
      case 'cancelled':
        return 'bg-red-100 text-red-800 neumorphic-inset'
      case 'no-show':
        return 'bg-gray-100 text-gray-800 neumorphic-inset'
      default:
        return 'bg-muted text-muted-foreground neumorphic-inset'
    }
  }

  // Set today's date as default on component mount
  useEffect(() => {
    const today = new Date()
    setSelectedDate(today.getDate())
    setCurrentMonth(today.getMonth() + 1)
    setCurrentYear(today.getFullYear())
  }, [])

  const handleDateClick = (date: number, isCurrentMonth: boolean) => {
    if (isCurrentMonth) {
      setSelectedDate(date)
    }
  }

  const handlePrevMonth = () => {
    setDirection(-1)
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setDirection(1)
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const getTodaysAppointments = () => {
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    const todays = appointmentsByDate[todayKey as keyof typeof appointmentsByDate] || []
    return sortAppointmentsByTime(todays)
  }


  const getSelectedDateAppointments = () => {
    if (!selectedDate) return []
    const dateKey = `${currentYear}-${currentMonth}-${selectedDate}`
    const selected = appointmentsByDate[dateKey as keyof typeof appointmentsByDate] || []
    return sortAppointmentsByTime(selected)
  }

  const calendarGrid = generateCalendarGrid(currentMonth, currentYear)
  const todaysAppointments = getTodaysAppointments()
  const selectedDateAppointments = getSelectedDateAppointments()

  return (
    <motion.div
      className="space-y-6 px-4 lg:px-6 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Message */}
      <motion.div
        className="text-left py-2"
        variants={itemVariants}
      >
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-foreground mb-1"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Welcome, Dr. Maartha Nelson
        </motion.h1>
      </motion.div>

      {/* Today's Appointments Section */}
      <motion.div
        className="-mt-2 space-y-4"
        variants={itemVariants}
      >
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <IconCalendar className="w-5 h-5 text-foreground" />
          </motion.div>
          <h2 className="text-lg md:text-xl font-semibold">Today's Appointments ({todaysAppointments.length})</h2>
        </motion.div>

        <AnimatePresence mode="wait">
          {todaysAppointments.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              variants={staggerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
            >
              {todaysAppointments.map((apt: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="neumorphic-inset p-3 md:p-4 rounded-lg neumorphic-hover cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-sm">{apt.time}</span>
                      </div>
                      <div className="w-px h-6 bg-muted/50" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{apt.patient}</span>
                        <p className="text-xs text-muted-foreground">{apt.reason}</p>
                        <p className="text-xs text-muted-foreground">{apt.doctor}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(apt.status)}`}
                    >
                      {apt.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="neumorphic-inset p-6 rounded-lg text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              >
                <IconCalendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              </motion.div>
              <motion.p
                className="text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                No appointments scheduled for today
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Calendar Section */}
      <motion.div
        variants={itemVariants}
      >
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-lg md:text-xl font-semibold text-foreground">Manage Future Appointments</h1>
        </motion.div>

        {/* Bento Grid Layout - Calendar and Appointments Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100%-4rem)]">
          {/* Appointments Table */}
          <motion.div
            className="col-span-12 md:col-span-8 lg:col-span-8 xl:col-span-8 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {/* Selected Date Appointments */}
            <AnimatePresence mode="wait">
              {selectedDate ? (
                <motion.div
                  className="flex-1 flex flex-col"
                  key={selectedDate}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    className="flex items-center justify-between mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-sm md:text-lg font-semibold text-foreground">
                      {formatDateUS(new Date(currentYear, currentMonth - 1, selectedDate))}
                    </h2>
                    <motion.span
                      className="text-sm text-muted-foreground"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, type: "spring" }}
                    >
                      {selectedDateAppointments.length > 0
                        ? `${selectedDateAppointments.length} appointments`
                        : 'No appointments'
                      }
                    </motion.span>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {selectedDateAppointments.length > 0 ? (
                      <motion.div
                        className="neumorphic-inset rounded-lg p-4 border-0 flex flex-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="overflow-x-auto flex-1">
                          <div className="max-h-[80vh] overflow-y-auto bg-card rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10 bg-card">
                                <tr className="border-b-2 border-muted/90 bg-muted/10">
                                  <th className="text-left font-medium py-3 px-2">Time</th>
                                  <th className="text-left font-medium py-3 px-2">Patient</th>
                                  <th className="text-left font-medium py-3 px-2">Reason</th>
                                  <th className="text-left font-medium py-3 px-2">Doctor</th>
                                  <th className="text-left font-medium py-3 px-2">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y-2 divide-muted/90">
                              {selectedDateAppointments.map((apt: any, index: number) => (
                                <tr key={index} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-3 px-2 font-medium text-sm">{apt.time}</td>
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                    <IconUserCircle className="w-5 h-5 text-muted-foreground" />
                                      <span className="font-medium text-sm">{apt.patient}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-muted-foreground text-sm max-w-xs">
                                    <div className="truncate" title={apt.reason}>
                                      {apt.reason}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-muted-foreground text-sm">{apt.doctor}</td>
                                  <td className="py-3 px-2">
                                    <motion.span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(apt.status)}`}
                                      variants={statusBadgeVariants}
                                      initial="initial"
                                      whileHover="hover"
                                      animate={apt.status === 'in progress' ? 'pulse' : 'initial'}
                                    >
                                      {apt.status}
                                    </motion.span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="neumorphic-inset rounded-lg p-8 border-0 flex flex-col items-center justify-center text-center"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                        >
                          <IconCalendar className="w-12 h-12 text-muted-foreground mb-4" />
                        </motion.div>
                        <motion.h3
                          className="text-lg font-medium text-foreground mb-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 }}
                        >
                          No Appointments Scheduled
                        </motion.h3>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col items-center justify-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="neumorphic-inset rounded-lg p-8 border-0 flex flex-col items-center justify-center text-center max-w-md"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
                    >
                      <IconCalendar className="w-16 h-16 text-muted-foreground mb-4" />
                    </motion.div>
                    <motion.h3
                      className="text-xl font-semibold text-foreground mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      Select a Date
                    </motion.h3>
                    <motion.p
                      className="text-muted-foreground text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      Choose a date from the calendar to view and manage appointments for that day.
                    </motion.p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Calendar Component */}
          <motion.div
            className="col-span-12 md:col-span-4 lg:col-span-4 xl:col-span-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Calendar Content */}
            <motion.div
              className="p-4 items-center justify-center neumorphic-pressed rounded-lg overflow-hidden aspect-square flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
                <motion.div
                  className="flex items-center gap-2 mb-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handlePrevMonth}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <IconChevronLeft className="w-3 h-3" />
                    </Button>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={`${currentMonth}-${currentYear}`}
                      className="text-sm md:text-base font-semibold"
                      initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {months[currentMonth - 1]} {currentYear}
                    </motion.h1>
                  </AnimatePresence>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleNextMonth}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <IconChevronRight className="w-3 h-3" />
                    </Button>
                  </motion.div>
                </motion.div>
              <div className="flex-1 flex flex-col">
                {/* Day Headers */}
                <motion.div
                  className="grid grid-cols-7 gap-0 p-1 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  {weekDays.map((day, index) => (
                    <motion.div
                      key={day}
                      className="mx-0.5 text-center text-xs font-medium text-muted-foreground neumorphic-inset px-1 py-1 rounded"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                    >
                      {day}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Calendar Grid */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentMonth}-${currentYear}`}
                    className="grid grid-cols-7 gap-0 p-1 flex-1"
                    variants={calendarVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={direction}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {calendarGrid.map((day, index) => (
                      <motion.div
                        key={index}
                        onClick={() => day.isCurrentMonth ? handleDateClick(day.date, day.isCurrentMonth) : undefined}
                        className={`
                          calendar-cell relative mx-0.5 my-0.5 rounded-lg cursor-pointer
                          aspect-square flex flex-col justify-center items-center
                          ${day.isCurrentMonth
                            ? selectedDate === day.date
                              ? 'neumorphic-pressed shadow-inner border-1 border-primary'
                              : 'neumorphic'
                            : 'neumorphic-inset opacity-50 cursor-not-allowed'
                          }
                          ${day.isToday && day.isCurrentMonth ? 'ring-2 ring-primary ring-inset' : ''}
                        `}
                        whileHover={day.isCurrentMonth ? { scale: 1.05 } : {}}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div
                          className={`
                            text-xs font-bold text-center
                            ${day.isCurrentMonth
                              ? selectedDate === day.date
                                ? 'text-primary font-bold'
                                : day.isToday
                                  ? 'text-primary font-bold'
                                  : 'text-foreground'
                              : 'text-muted-foreground/60'
                            }
                          `}
                        >
                          {day.date}
                        </div>

                        {/* Show appointment count badge */}
                        <AnimatePresence>
                          {day.appointments.length > 0 && day.isCurrentMonth && (
                            <motion.div
                              className="-mt-0.5"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                            >
                              <motion.div
                                className={`appointment-badge inline-flex items-center justify-center text-xs font-medium rounded-full px-1 neumorphic-inset bg-primary/10 text-primary border border-primary/20`}
                                whileHover={{ scale: 1.1 }}
                                animate={{
                                  scale: [1, 1.1, 1],
                                  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                }}
                              >
                                {day.appointments.length}
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
