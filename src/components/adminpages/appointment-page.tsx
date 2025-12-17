// /mnt/data/appointment-page.tsx
import { useState, useEffect } from "react"
import { IconCalendar, IconUserCircle, IconFilter, IconSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { AuthStorage } from "@/api/auth"
import { AdminAppointmentsAPI } from "@/api/admin"
import { formatDateUS } from "@/lib/date"
import { getErrorMessage } from "@/lib/errors"
import type { AppointmentFilters } from "@/api/shared/types"




export function AppointmentPage() {
  // Filter states
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // API state
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track page load time to avoid premature logout on 401 errors
  const pageLoadStartTime = Date.now()

  // Get unique doctors from appointments data
  const uniqueDoctors = Array.from(
    new Map(
      appointments
        .filter(apt => apt.doctor?.name && apt.doctor_id)
        .map(apt => [apt.doctor_id, {
          id: apt.doctor_id,
          name: apt.doctor?.name,
          department: apt.doctor?.department
        }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Filter appointments based on current filters
  const filteredAppointments = appointments.filter(appointment => {
    let matches = true

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.toLowerCase()
      const doctorName = (appointment.doctor?.name || '').toLowerCase()
      const department = (appointment.doctor?.department || '').toLowerCase()

      matches = matches && (
        patientName.includes(query) ||
        doctorName.includes(query) ||
        department.includes(query)
      )
    }

    // Filter by doctor
    if (selectedDoctorId !== 'all') {
      matches = matches && appointment.doctor_id === parseInt(selectedDoctorId)
    }

    // Filter by date
    if (selectedDate) {
      const appointmentDate = new Date(appointment.appointment_time).toISOString().split('T')[0]
      matches = matches && appointmentDate === selectedDate
    }

    return matches
  })

  // Get status styling based on appointment status with colors
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 border border-green-200'
      case 'in progress':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-700 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  // Fetch appointments on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Add a delay to allow authentication validation to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        setLoading(true)
        setError(null)

        const appointmentsData = await AdminAppointmentsAPI.getAllAppointments()
        setAppointments(appointmentsData)
        // console.log('✅ Loaded appointments:', appointmentsData.length)
      } catch (err) {
        console.error('Failed to fetch data:', err)

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

    fetchData()
  }, [])


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
    <div className="space-y-6 px-4 lg:px-6 relative">

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search - Left */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by patient, doctor, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-sm neumorphic-inset border-2 border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Filters - Right */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconFilter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter by:</span>
          </div>

          {/* Doctor Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Doctor:</label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-48 neumorphic-inset">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {uniqueDoctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name} {doctor.department && `(${doctor.department})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select date"
              className="w-40"
            />
            {selectedDate && (
              <Button
                onClick={() => setSelectedDate('')}
                variant="outline"
                size="sm"
                className="h-9 px-2"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="neumorphic-inset rounded-lg p-4 border-0">

        <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b-2 border-muted/90 bg-muted/10">
                <th className="text-left font-medium py-3 px-4">Date</th>
                <th className="text-left font-medium py-3 px-4">Patient</th>
                <th className="text-left font-medium py-3 px-4">Doctor</th>
                <th className="text-left font-medium py-3 px-4">Department</th>
                <th className="text-left font-medium py-3 px-4">Reason for Visit</th>
                <th className="text-left font-medium py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-muted/90">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="text-center">
                      <IconCalendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {selectedDoctorId !== 'all' || selectedDate
                          ? 'No appointments match the selected filters'
                          : 'No appointments found'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment: any, index: number) => (
                  <tr key={appointment.id || index} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">
                          {formatDateUS(new Date(appointment.appointment_time))}
                        </div>
                        {/* <div className="text-xs text-muted-foreground">
                          {new Date(appointment.appointment_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div> */}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <IconUserCircle className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{appointment.patient?.first_name} {appointment.patient?.last_name}</div>
                          {/* <div className="text-xs text-muted-foreground">ID: {appointment.patient_id}</div> */}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-sm">{appointment.doctor?.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {appointment.doctor?.department || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {appointment.reason_for_visit || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(appointment.status)}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
