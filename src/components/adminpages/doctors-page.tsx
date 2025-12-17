import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { IconArrowLeft, IconChevronRight, IconUserCircle, IconStethoscope, IconX, IconFilter, IconSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { AdminDoctorsAPI } from "@/api/admin/doctors"
import { AdminAppointmentsAPI } from "@/api/admin/appointments"
import { AuthAPI, AuthStorage } from "@/api/auth"
import { useAuth } from "@/contexts/auth-context"
import { useCounts } from "@/contexts/counts-context"
import { getErrorMessage, getToastErrorMessage } from "@/lib/errors"
import { getCurrentDateInLocal } from "@/lib/date"
import toast from "react-hot-toast"

// Doctor Appointments Modal Component
function DoctorAppointmentsModal({ doctor, onClose }: { doctor: any, onClose: () => void }) {
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(11)
  const [currentYear, setCurrentYear] = useState(2025)
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

  // Set current date as default on component mount
  useEffect(() => {
    const today = getCurrentDateInLocal()
    setSelectedDate(today.getDate())
    setCurrentMonth(today.getMonth() + 1)
    setCurrentYear(today.getFullYear())
  }, [])

  // Fetch appointments for this doctor
  useEffect(() => {
    const fetchDoctorAppointments = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await AdminAppointmentsAPI.getAllAppointments({ doctor_id: doctor.id })
        // console.log('Doctor appointments:', response)

        // Handle API response structure
        let appointmentsArray: any[] = []
        if (response && typeof response === 'object' && !Array.isArray(response) && Array.isArray((response as any).appointments)) {
          appointmentsArray = (response as any).appointments
        } else if (Array.isArray(response)) {
          appointmentsArray = response
        } else {
          console.warn('Unexpected API response structure:', response)
          appointmentsArray = []
        }

        setAppointments(appointmentsArray)
      } catch (err) {
        console.error('Failed to fetch doctor appointments:', err)

        // Check if it's a 401 (token expired) error and handle logout
        // But don't logout immediately on page load to avoid issues with auth validation timing
        const pageLoadTime = Date.now() - pageLoadStartTime
        if (err && typeof err === 'object' && 'status' in err && err.status === 401 && pageLoadTime > 2000) {
          // console.log('🔐 Token expired, logging out user...')
          AuthStorage.clearAll()
          return // Don't show error, logout will redirect to login
        }

        setError(getErrorMessage(err))
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    fetchDoctorAppointments()
  }, [doctor.id])

  // Generate calendar grid
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
    const today = getCurrentDateInLocal()
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
    const remainingCells = 42 - calendar.length
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

  const getSelectedDateAppointments = () => {
    if (!selectedDate) return []
    const selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    const selected = Array.isArray(appointments) ? appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_time).toISOString().split('T')[0]
      return aptDate === selectedDateStr
    }) : []
    return selected.sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime())
  }

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

  const calendarGrid = generateCalendarGrid(currentMonth, currentYear)
  const selectedDateAppointments = getSelectedDateAppointments()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background neumorphic-pressed rounded-lg w-full max-w-6xl mx-auto max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Appointments for {doctor.name}</h2>
              <p className="text-sm text-foreground">{doctor.department} Department</p>
            </div>
            <Button
              onClick={onClose}
              className="neumorphic-button-destructive"
            >
              Close
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-foreground">Loading appointments...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <p className="font-medium">Failed to load appointments</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <Button onClick={() => window.location.reload()} className="neumorphic-button-primary">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Calendar */}
              <div className="col-span-12 lg:col-span-5">
                <div className="neumorphic-inset rounded-lg p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center gap-2 mb-4 px-6 justify-center">
                    <Button
                      onClick={handlePrevMonth}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <IconArrowLeft className="w-3 h-3" />
                    </Button>
                    <h3 className="text-sm font-semibold flex-1 text-center">
                      {months[currentMonth - 1]} {currentYear}
                    </h3>
                    <Button
                      onClick={handleNextMonth}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <IconChevronRight className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Week Days Header */}
                  <div className="grid grid-cols-7 gap-1 px-6 mb-2">
                    {weekDays.map((day) => (
                      <div key={day} className="text-center text-xs font-medium neumorphic-inset px-1 py-1 rounded">
                        {day.charAt(0)}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 p-6">
                    {calendarGrid.map((day, index) => (
                      <div
                        key={index}
                        onClick={() => day.isCurrentMonth ? handleDateClick(day.date, day.isCurrentMonth) : undefined}
                        className={`
                          calendar-cell relative rounded-lg cursor-pointer neumorphic
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
                        <div className="text-sm font-bold text-center leading-tight">
                          {day.date}
                        </div>
                        {day.appointments.length > 0 && day.isCurrentMonth && (
                          <div className="-mt-1">
                            <div className="appointment-badge inline-flex items-center justify-center text-xs font-medium rounded-full neumorphic-inset bg-primary/10 border border-primary/20 px-1">
                              {day.appointments.length}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Appointments Table */}
              <div className="col-span-12 lg:col-span-7">
                <div className="neumorphic-inset rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {selectedDate ? new Date(currentYear, currentMonth - 1, selectedDate).toLocaleDateString() : 'Select a date'}
                    </h3>
                    <span className="text-sm text-foreground">
                      {selectedDateAppointments.length} appointments
                    </span>
                  </div>

                  {selectedDateAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-muted/90">
                            <th className="text-left font-medium py-2 px-2">Time</th>
                            <th className="text-left font-medium py-2 px-2">Patient</th>
                            <th className="text-left font-medium py-2 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/90">
                          {selectedDateAppointments.map((apt: any, index: number) => (
                            <tr key={index} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2 font-medium">
                                {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  <IconUserCircle className="w-4 h-4" />
                                  <span className="text-sm">{apt.patient?.first_name} {apt.patient?.last_name}</span>
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(apt.status)}`}>
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-foreground">No appointments scheduled for this date</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface DoctorsPageProps {
  pageParams?: { department?: string }
}

export function DoctorsPage({ pageParams }: DoctorsPageProps) {
  // Track page load time to avoid premature logout on 401 errors
  const pageLoadStartTime = Date.now()
  const navigate = useNavigate()

  const { setDoctorsCount } = useCounts()
  const { refreshProfile } = useAuth()
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false)
  const [selectedDoctorForAppointments, setSelectedDoctorForAppointments] = useState<any | null>(null)
  const [loggingInAs, setLoggingInAs] = useState<number | null>(null)

  // API state
  const [doctors, setDoctors] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>(pageParams?.department || 'all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch doctors and appointments data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch doctors and appointments in parallel
        const [doctorsResponse, appointmentsResponse] = await Promise.all([
          AdminDoctorsAPI.getAllDoctors(),
          AdminAppointmentsAPI.getAllAppointments()
        ])

        setDoctors(doctorsResponse)
        setAppointments(appointmentsResponse)

        // Update doctors count in context for header
        setDoctorsCount(doctorsResponse.length)
      } catch (err) {
        console.error('Error fetching doctors data:', err)

        // Check if it's a 401 (token expired) error and handle logout
        // But don't logout immediately on page load to avoid issues with auth validation timing
        const pageLoadTime = Date.now() - pageLoadStartTime
        if (err && typeof err === 'object' && 'status' in err && err.status === 401 && pageLoadTime > 2000) {
          // console.log('🔐 Token expired, logging out user...')
          AuthStorage.clearAll()
          return // Don't show error, logout will redirect to login
        }

        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate unique patient count for each doctor
  const getPatientCount = (doctorId: number) => {
    const doctorAppointments = appointments.filter(apt => apt.doctor_id === doctorId)
    const uniquePatients = new Set(doctorAppointments.map(apt => apt.patient_id))
    return uniquePatients.size
  }

  // Get unique departments for filter dropdown
  const departments = Array.from(new Set(doctors.map(doctor => doctor.department).filter(Boolean)))

  // Filter doctors based on selected department and search query
  const filteredDoctors = doctors.filter(doctor => {
    let matches = true

    // Filter by department
    if (selectedDepartment !== 'all') {
      matches = matches && doctor.department === selectedDepartment
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = (doctor.name || '').toLowerCase()
      const department = (doctor.department || '').toLowerCase()
      const email = (doctor.email || '').toLowerCase()

      matches = matches && (
        name.includes(query) ||
        department.includes(query) ||
        email.includes(query)
      )
    }

    return matches
  })

  const handleCloseProfile = () => {
    setSelectedDoctor(null)
    setViewMode('table')
  }

  const handleLoginAsDoctor = async (doctorId: number) => {
    try {
      setLoggingInAs(doctorId)

      const response = await AuthAPI.adminLoginAsDoctor({ doctor_id: doctorId })

      // Store only the JWT token and mark as impersonating
      AuthStorage.setToken(response.access_token)
      AuthStorage.setAdminImpersonating(true)

      // Refresh profile to load doctor/clinic data via AuthProvider
      await refreshProfile()

      // Navigate to doctor dashboard
      navigate('/doctor/appointments', { replace: true })
    } catch (error) {
      console.error('Failed to login as doctor:', error)
      const errorMessage = getToastErrorMessage(error, 'data', 'Failed to login as doctor. Please try again.')
      toast.error(errorMessage)
    } finally {
      setLoggingInAs(null)
    }
  }

  if (viewMode === 'profile' && selectedDoctor) {
    return (
      <div className="space-y-6">
        {/* Profile Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleCloseProfile}
            className="flex items-center gap-2"
          >
            <IconArrowLeft className="w-4 h-4" />
            Back to Doctors
          </Button>
          <h1 className="text-2xl font-bold">{selectedDoctor.name}</h1>
        </div>

        {/* Doctor Profile */}
        <div className="neumorphic-inset p-6 rounded-lg">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <IconStethoscope className="w-12 h-12 text-foreground" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedDoctor.name}</h2>
                <p className="text-foreground">{selectedDoctor.department}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground">Email</p>
                  <p className="font-medium">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Phone</p>
                  <p className="font-medium">{selectedDoctor.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Clinic ID</p>
                  <p className="font-medium">{selectedDoctor.clinic_id}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedDoctor.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedDoctor.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading doctors...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error: {error}</div>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search - Left */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, department, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-sm neumorphic-inset rounded-md border-2 border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Filter - Right */}
        <div className="flex items-center gap-2">
          <IconFilter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by:</span>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48 neumorphic-inset">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="neumorphic-inset rounded-lg p-4 border-0">
        <div className="overflow-x-auto max-h-[77vh] overflow-y-auto bg-card rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b-2 border-muted/90 bg-muted/10">
                <th className="text-left font-medium py-3 px-2">Doctor Name</th>
                <th className="text-left font-medium py-3 px-2">Department</th>
                <th className="text-left font-medium py-3 px-2">Email</th>
                <th className="text-left font-medium py-3 px-2">Patients</th>
                <th className="text-left font-medium py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-muted/90">
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <IconUserCircle className="w-5 h-5" />
                      <span className="font-medium">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">{doctor.department}</td>
                  <td className="py-3 px-2" style={{ textTransform: 'none' }}>{doctor.email}</td>
                  <td className="py-3 px-2 font-medium">{getPatientCount(doctor.id)}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <Button
                        className="neumorphic-button-primary"
                        onClick={() => {
                          setSelectedDoctorForAppointments(doctor)
                          setShowAppointmentsModal(true)
                        }}
                      >
                        View Appointments
                      </Button>
                      <Button
                        onClick={() => handleLoginAsDoctor(doctor.id)}
                        disabled={loggingInAs === doctor.id}
                        className="neumorphic-button-primary"
                      >
                        {loggingInAs === doctor.id ? 'Logging in...' : 'Login'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Appointments Modal */}
      {showAppointmentsModal && selectedDoctorForAppointments && (
        <DoctorAppointmentsModal
          doctor={selectedDoctorForAppointments}
          onClose={() => {
            setShowAppointmentsModal(false)
            setSelectedDoctorForAppointments(null)
          }}
        />
      )}
    </div>
  )
}
