import { useState, useEffect } from "react"
import { IconArrowLeft, IconUserCircle, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateUS, formatDateUSShort, getCurrentDateInLocal, getCurrentDateStringInLocal } from "@/lib/date"
import { getErrorMessage, getToastErrorMessage } from "@/lib/errors"
import { AuthStorage } from "@/api/auth"
import { DoctorPatientsAPI, DoctorAppointmentsAPI } from "@/api/doctor"
import type { Patient } from "@/api/shared/types"

type PatientDocument = {
  document_id?: number
  id?: number
  type: string
  title?: string
  description?: string
  uploaded_at?: string
  url?: string
  file_url?: string
  document_url?: string
}

interface ExtendedPatient extends Patient {
  documents?: PatientDocument[]
  appointments?: {
    upcoming: Array<{
      date: string
      time: string
      status: string
      appointment_id: number
    }>
    past: Array<{
      date: string
      time: string
      status: string
      appointment_id: number
    }>
  }
}

// Global function to trigger page navigation (will be set by App.tsx)
declare global {
  interface Window {
    navigateToPage?: (page: string) => void
  }
}

export function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<ExtendedPatient | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')

  // Helper function to filter name input - only allow letters, spaces, hyphens, and apostrophes
  const validateNameInput = (value: string): { value: string; error: string } => {
    let error = ''
    let filtered = value

    // Check for invalid characters first
    const originalLength = value.length
    filtered = value.replace(/[^a-zA-Z\s'-]/g, '')
    const hasInvalidChars = filtered.length < originalLength

    if (hasInvalidChars && value.length > 0) {
      error = 'Only letters, spaces, hyphens, and apostrophes are allowed'
    }

    // Limit total length to 15 characters (reasonable for names)
    if (filtered.length > 15) {
      filtered = filtered.substring(0, 15)
      error = error || 'Name must be 15 characters or less'
    }

    // Check for excessive repeating characters before limiting them
    const hasExcessiveRepeats = /(.)\1{3,}/.test(filtered)
    if (hasExcessiveRepeats) {
      error = error || 'Please avoid repeating the same letter more than 3 times'
    }

    // Prevent excessive repeating of the same character (more than 3 in a row)
    filtered = filtered.replace(/(.)\1{3,}/g, '$1$1$1')

    // Remove leading/trailing spaces and multiple consecutive spaces
    filtered = filtered.trim().replace(/\s+/g, ' ')

    // Ensure at least one letter and not just special characters
    if (filtered.length > 0 && !/[a-zA-Z]/.test(filtered)) {
      error = 'Name must contain at least one letter'
      filtered = ''
    }

    // Prevent names that are just single repeated letters (like "aaaaa")
    if (filtered.length >= 3 && /^(.)\1+$/.test(filtered.replace(/\s/g, ''))) {
      error = error || 'Please enter a proper name, not repeated letters'
      filtered = ''
    }

    return { value: filtered, error }
  }

  // Form state for adding patient
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    phoneNumber: '',
    // Guardian fields
    guardianFirstName: '',
    guardianMiddleName: '',
    guardianLastName: '',
    guardianDob: '',
    guardianRelationship: ''
  })

  // Form validation errors
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    phoneNumber: '',
    guardianFirstName: '',
    guardianMiddleName: '',
    guardianLastName: '',
    guardianDob: '',
    guardianRelationship: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // API state
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)


  // Document loading states
  const [downloadingDoc, setDownloadingDoc] = useState<number | null>(null)
  const [viewingDoc, setViewingDoc] = useState<number | null>(null)

  // Schedule/Reschedule modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [scheduling, setScheduling] = useState(false)

  // Cancel confirmation modal state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelAppointmentId, setCancelAppointmentId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Fetch clinics and patients data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = AuthStorage.getUserData()
        const clinicId = userData?.clinic_id

        if (!clinicId) {
          setError('Clinic ID not found. Please log in again.')
          return
        }

        // Fetch patients for this doctor's clinic
        const patientsData = await DoctorPatientsAPI.getAllPatients(clinicId)
        setAllPatients(patientsData)
        setFilteredPatients(patientsData) // Initially show all patients from their clinic
      } catch (err) {
        console.error('Failed to fetch data:', err)

        // Check if this is an authentication error
        const errorMessage = err instanceof Error ? err.message : 'Failed to load patients'
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('session has expired')) {
          // console.log('🔐 Authentication error detected, redirecting to login...')
          if (window.navigateToPage) {
            window.navigateToPage('login')
          }
          return
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Doctors see all patients from their clinic
  useEffect(() => {
    setFilteredPatients(allPatients)
  }, [allPatients])

  // Transform appointment data from API format to display format
  const transformAppointments = (appointments: any[]): { upcoming: any[], past: any[] } => {
    const today = getCurrentDateInLocal()
    today.setHours(0, 0, 0, 0)

    const upcoming: any[] = []
    const past: any[] = []

    appointments.forEach((appt) => {
      // Handle new API format where appointment_time is a full datetime string like "2026-12-09T10:00:00"
      let appointmentDate: Date
      let formattedTime: string
      let dateStr: string

      if (appt.appointment_time && appt.appointment_time.includes('T')) {
        // Full datetime format: "2026-12-09T10:00:00"
        const dateTime = new Date(appt.appointment_time)
        appointmentDate = new Date(dateTime)
        appointmentDate.setHours(0, 0, 0, 0)

        formattedTime = dateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        dateStr = dateTime.toISOString().split('T')[0]
      } else if (appt.appointment_date) {
        // Separate date and time format
        appointmentDate = new Date(appt.appointment_date)
        appointmentDate.setHours(0, 0, 0, 0)

        const timeStr = appt.appointment_time || ''
        formattedTime = timeStr.includes(':')
          ? new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          : timeStr

        dateStr = appt.appointment_date
      } else {
        return // Skip invalid appointments
      }

      const appointmentData = {
        date: dateStr,
        time: formattedTime,
        status: appt.status || 'scheduled',
        appointment_id: appt.id,
        appointment_time: appt.appointment_time
      }

      if (appointmentDate >= today && appt.status?.toLowerCase() !== 'cancelled') {
        upcoming.push(appointmentData)
      } else {
        past.push(appointmentData)
      }
    })

    // Sort upcoming by date ascending, past by date descending
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return { upcoming, past }
  }

  const handleViewProfile = async (patient: Patient) => {
    try {
      setProfileLoading(true)
      setProfileError(null)
      setViewMode('profile')

      // Fetch appointments and documents in parallel (patient details already available from list)
      const [appointmentsData, documentsData] = await Promise.all([
        DoctorAppointmentsAPI.getAppointmentsByPatient(patient.id).catch((err) => {
          // Check if this is an authentication error (401)
          if (err?.message?.includes('401') || err?.message?.includes('unauthorized') || err?.message?.includes('session has expired')) {
            // console.log('🔐 Authentication error detected, redirecting to login...')
            if (window.navigateToPage) {
              window.navigateToPage('login')
            }
            return []
          }
          return []
        }),
        DoctorPatientsAPI.getPatientDocuments(patient.id).catch((err) => {
          // Check if this is an authentication error (401)
          if (err?.message?.includes('401') || err?.message?.includes('unauthorized') || err?.message?.includes('session has expired')) {
            // console.log('🔐 Authentication error detected, redirecting to login...')
            if (window.navigateToPage) {
              window.navigateToPage('login')
            }
            return []
          }
          return []
        })
      ])

      const transformedAppointments = transformAppointments(appointmentsData)

      const extendedPatient: ExtendedPatient = {
        ...patient,
        guardians: [], // Guardians are included in the patient list response, but let's use empty array as fallback
        documents: documentsData,
        appointments: transformedAppointments
      }

      setSelectedPatient(extendedPatient)
    } catch (err) {
      console.error('Failed to fetch patient profile:', err)

      // Check if this is an authentication error
      const errorMessage = err instanceof Error ? err.message : 'Failed to load patient profile'
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('session has expired')) {
        // console.log('🔐 Authentication error detected in main catch, redirecting to login...')
        if (window.navigateToPage) {
          window.navigateToPage('login')
        }
        return
      }

      setProfileError(errorMessage)
      // Still set the basic patient data
      setSelectedPatient({
        ...patient,
        guardians: [],
        documents: [],
        appointments: { upcoming: [], past: [] }
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleCloseProfile = () => {
    setSelectedPatient(null)
    setViewMode('table')
    setProfileError(null)
  }

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      const userData = AuthStorage.getUserData()
      const clinicId = userData?.clinic_id

      if (!clinicId) {
        setSubmitError('Clinic ID not found. Please log in again.')
        return
      }

      // Format phone number for API (remove formatting, add +1 prefix)
      const cleanPhoneNumber = '+1' + formData.phoneNumber.replace(/\D/g, '')

      const patientData: any = {
        clinic_id: clinicId,
        first_name: formData.firstName.trim(),
        middle_name: formData.middleName.trim(),
        last_name: formData.lastName.trim(),
        dob: formData.dob,
        phone: cleanPhoneNumber,
      }

      // Add guardian information if patient is a minor
      if (isPatientMinor(formData.dob)) {
        patientData.guardian = {
          clinic_id: clinicId,
          first_name: formData.guardianFirstName.trim(),
          middle_name: formData.guardianMiddleName.trim(),
          last_name: formData.guardianLastName.trim(),
          dob: formData.guardianDob,
          relationship_to_patient: formData.guardianRelationship
        }
      }

      await DoctorPatientsAPI.createPatient(patientData)

      // Refresh patients list
      const patientsData = await DoctorPatientsAPI.getAllPatients(clinicId)
      setAllPatients(patientsData)
      // filteredPatients will be updated automatically by the useEffect

      // Reset form and close modal
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        phoneNumber: '',
        guardianFirstName: '',
        guardianMiddleName: '',
        guardianLastName: '',
        guardianDob: '',
        guardianRelationship: ''
      })
      setShowAddForm(false)
    } catch (err) {
      console.error('Failed to create patient:', err)
      setSubmitError(getErrorMessage(err, 'data'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSchedule = () => {
    if (!selectedPatient) return
    setShowScheduleModal(true)
    setSelectedDate('')
    setAvailableSlots([])
    setSelectedTimeSlot('')
  }

  const handleRescheduleAppointment = (appointmentId: number) => {
    if (!selectedPatient) return
    setRescheduleAppointmentId(appointmentId)
    setShowRescheduleModal(true)
    setSelectedDate('')
    setAvailableSlots([])
    setSelectedTimeSlot('')
  }

  const fetchAvailability = async (date: string) => {
    if (!date || !selectedPatient) return

    setLoadingSlots(true)
    setAvailableSlots([])
    setSelectedTimeSlot('')

    try {
      const userData = AuthStorage.getUserData()
      const clinicId = userData?.clinic_id
      const doctorId = userData?.id

      if (!clinicId || !doctorId) {
        showToast('Unable to fetch availability. Please log in again.', 'error')
        return
      }

      const availabilityData = await DoctorAppointmentsAPI.getDoctorAvailability(
        clinicId,
        doctorId,
        date,
        date
      )

      // Handle API response format
      if (availabilityData.availability && Array.isArray(availabilityData.availability)) {
        const dayAvailability = availabilityData.availability.find(
          (avail: any) => avail.date === date
        )

        if (dayAvailability && dayAvailability.is_available && dayAvailability.time_slots) {
          const morningSlots = dayAvailability.time_slots.morning || []
          const afternoonSlots = dayAvailability.time_slots.afternoon || []
          let slots = [...morningSlots, ...afternoonSlots]

          // If selected date is today, only show future time slots
          const todayStr = getCurrentDateStringInLocal()
          if (date === todayStr) {
            const now = getCurrentDateInLocal()
            const nowMinutes = now.getHours() * 60 + now.getMinutes()
            const parseSlotToMinutes = (slot: string) => {
              const timeParts = slot.trim().split(' ')
              if (timeParts.length === 2) {
                const [time, modifier] = timeParts
                const [h, m = '0'] = time.split(':')
                let hours = parseInt(h, 10)
                if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12
                if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0
                return hours * 60 + parseInt(m, 10)
              }
              // Fallback for 24h or unknown formats
              const [h, m = '0'] = slot.split(':')
              return parseInt(h, 10) * 60 + parseInt(m, 10)
            }
            slots = slots.filter((slot) => parseSlotToMinutes(slot) > nowMinutes)
          }

          setAvailableSlots(slots)
        } else {
          setAvailableSlots([])
          showToast('No available time slots for this date.', 'info')
        }
      } else {
        setAvailableSlots([])
        showToast('Unable to fetch availability for this date.', 'error')
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to fetch availability. Please try again.'), 'error')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }


  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ')
    let [hours, minutes] = time.split(':')

    if (hours === '12') {
      hours = '00'
    }

    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString()
    }

    return `${hours.padStart(2, '0')}:${minutes || '00'}`
  }

  const handleScheduleAppointment = async () => {
    if (!selectedPatient || !selectedDate || !selectedTimeSlot) {
      showToast('Please select a date and time slot.', 'info')
      return
    }

    setScheduling(true)

    try {
      const userData = AuthStorage.getUserData()
      const clinicId = userData?.clinic_id
      const doctorId = userData?.id

      if (!clinicId || !doctorId) {
        showToast('Unable to schedule appointment. Please log in again.', 'error')
        return
      }

      // Convert time slot to 24-hour format for API
      const time24 = convertTo24Hour(selectedTimeSlot)

      await DoctorAppointmentsAPI.bookAppointment({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        date: selectedDate,
        time: time24,
        phone: selectedPatient.phone_number
      })

      // Refresh patient profile
      await handleViewProfile(selectedPatient)

      // Close modal
      setShowScheduleModal(false)
      setSelectedDate('')
      setAvailableSlots([])
      setSelectedTimeSlot('')

      showToast('Appointment scheduled successfully', 'success')
    } catch (err) {
      console.error('Failed to schedule appointment:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to schedule appointment. Please try again.'), 'error')
    } finally {
      setScheduling(false)
    }
  }

  const handleRescheduleAppointmentSubmit = async () => {
    if (!selectedPatient || !selectedDate || !selectedTimeSlot || !rescheduleAppointmentId) {
      showToast('Please select a date and time slot.', 'info')
      return
    }

    setScheduling(true)

    try {
      const userData = AuthStorage.getUserData()
      const clinicId = userData?.clinic_id
      const doctorId = userData?.id

      if (!clinicId || !doctorId) {
        showToast('Unable to reschedule appointment. Please log in again.', 'error')
        return
      }

      // Convert time slot to 24-hour format for API
      const time24 = convertTo24Hour(selectedTimeSlot)

      await DoctorAppointmentsAPI.rescheduleAppointment({
        appointment_id: rescheduleAppointmentId,
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        date: selectedDate,
        time: time24,
        phone: selectedPatient.phone_number
      })

      // Refresh patient profile
      await handleViewProfile(selectedPatient)

      // Close modal
      setShowRescheduleModal(false)
      setRescheduleAppointmentId(null)
      setSelectedDate('')
      setAvailableSlots([])
      setSelectedTimeSlot('')

      showToast('Appointment rescheduled successfully', 'success')
    } catch (err) {
      console.error('Failed to reschedule appointment:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to reschedule appointment. Please try again.'), 'error')
    } finally {
      setScheduling(false)
    }
  }

  const handleViewDocument = async (doc: PatientDocument) => {
    if (!doc || !selectedPatient) return

    setViewingDoc(doc.document_id || doc.id || null)

    try {
      await DoctorPatientsAPI.viewDocument(doc, selectedPatient.id)
    } catch (err) {
      console.error('Failed to view document:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to open document. Please try again.'), 'error')
    } finally {
      setViewingDoc(null)
    }
  }

  const handleDownloadDocument = async (doc: PatientDocument) => {
    if (!doc || !selectedPatient) return

    const docId = doc.document_id || doc.id
    setDownloadingDoc(docId || null)

    try {
      await DoctorPatientsAPI.downloadDocument(doc, selectedPatient.id)
    } catch (err) {
      console.error('Failed to download document:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to download document. Please try again.'), 'error')
    } finally {
      setDownloadingDoc(null)
    }
  }

  const handleCancelAppointment = (appointmentId: number) => {
    if (!selectedPatient) return
    setCancelAppointmentId(appointmentId)
    setShowCancelConfirm(true)
  }

  const confirmCancelAppointment = async () => {
    if (!selectedPatient || !cancelAppointmentId) return

    setCancelling(true)

    try {
      const userData = AuthStorage.getUserData()
      const clinicId = userData?.clinic_id
      const doctorId = userData?.id

      if (!clinicId || !doctorId) {
        showToast('Unable to cancel appointment. Please log in again.', 'error')
        setShowCancelConfirm(false)
        setCancelAppointmentId(null)
        return
      }

      await DoctorAppointmentsAPI.cancelAppointment({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        appointment_id: cancelAppointmentId,
        phone: selectedPatient.phone_number
      })

      // Refresh patient profile to update appointments
      await handleViewProfile(selectedPatient)

      setShowCancelConfirm(false)
      setCancelAppointmentId(null)
      showToast('Appointment cancelled successfully', 'success')
    } catch (err) {
      console.error('Failed to cancel appointment:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to cancel appointment. Please try again.'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  const handleDownloadProfile = () => {
    if (!selectedPatient) return

    // Prepare patient data for export
    const profileData = {
      patient: {
        id: selectedPatient.id,
        first_name: selectedPatient.first_name,
        last_name: selectedPatient.last_name,
        dob: selectedPatient.dob,
        phone_number: selectedPatient.phone_number,
        email: selectedPatient.email,
        status: selectedPatient.status
      },
      guardians: selectedPatient.guardians || [],
      appointments: selectedPatient.appointments || { upcoming: [], past: [] },
      documents: selectedPatient.documents?.map(doc => ({
        type: doc.type,
        title: doc.title,
        description: doc.description,
        uploaded_at: doc.uploaded_at
      })) || [],
      exported_at: new Date().toISOString()
    }

    // Create and download JSON file
    const dataStr = JSON.stringify(profileData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `patient_profile_${selectedPatient.id}_${selectedPatient.first_name}_${selectedPatient.last_name}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = getCurrentDateInLocal()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  const isPatientMinor = (dob: string) => {
    if (!dob) return false
    return calculateAge(dob) < 18
  }

  const formatDate = (dateString: string) => {
    return formatDateUS(dateString)
  }

  // Render modals - these should always be available regardless of view mode
  const renderModals = () => (
    <>
      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            if (!scheduling && !loadingSlots) {
              setShowScheduleModal(false)
              setSelectedDate('')
              setAvailableSlots([])
              setSelectedTimeSlot('')
            }
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Schedule Appointment</h2>
                <Button
                  onClick={() => {
                    setShowScheduleModal(false)
                    setSelectedDate('')
                    setAvailableSlots([])
                    setSelectedTimeSlot('')
                  }}
                  disabled={scheduling || loadingSlots}
                  className="w-8 h-8 flex items-center justify-center text-lg font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                    Select Date *
                  </label>
                  <DatePicker
                    value={selectedDate}
                    onChange={(value) => {
                      setSelectedDate(value)
                      if (value) {
                        fetchAvailability(value)
                      } else {
                        setAvailableSlots([])
                        setSelectedTimeSlot('')
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    minDate={new Date()} // prevent past dates
                    disabled={scheduling || loadingSlots}
                    className="w-full"
                  />
                </div>

                {loadingSlots && (
                  <div className="flex items-center justify-center py-4">
                    <IconLoader2 className="w-6 h-6 animate-spin text-foreground" />
                    <span className="ml-2 text-sm">Loading available slots...</span>
                  </div>
                )}

                {!loadingSlots && selectedDate && availableSlots.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                      Select Time Slot *
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`text-sm font-medium neumorphic-pressed text-foreground rounded-lg cursor-pointer transition-all duration-200 px-2 py-2 border ${selectedTimeSlot === slot
                            ? 'border-2 border-primary'
                            : ''
                            }`}
                          disabled={scheduling}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingSlots && selectedDate && availableSlots.length === 0 && (
                  <div className="text-center py-4 text-sm text-foreground">
                    No available time slots for this date.
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowScheduleModal(false)
                      setSelectedDate('')
                      setAvailableSlots([])
                      setSelectedTimeSlot('')
                    }}
                    disabled={scheduling || loadingSlots}
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleScheduleAppointment}
                    disabled={scheduling || loadingSlots || !selectedDate || !selectedTimeSlot}
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scheduling ? (
                      <span className="flex items-center justify-center">
                        <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                        Scheduling...
                      </span>
                    ) : (
                      'Schedule'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Appointment Modal */}
      {showRescheduleModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            if (!scheduling && !loadingSlots) {
              setShowRescheduleModal(false)
              setRescheduleAppointmentId(null)
              setSelectedDate('')
              setAvailableSlots([])
              setSelectedTimeSlot('')
            }
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Reschedule Appointment</h2>
                <Button
                  onClick={() => {
                    setShowRescheduleModal(false)
                    setRescheduleAppointmentId(null)
                    setSelectedDate('')
                    setAvailableSlots([])
                    setSelectedTimeSlot('')
                  }}
                  disabled={scheduling || loadingSlots}
                  className="w-8 h-8 flex items-center justify-center text-lg font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                    Select New Date *
                  </label>
                  <DatePicker
                    value={selectedDate}
                    onChange={(value) => {
                      setSelectedDate(value)
                      if (value) {
                        fetchAvailability(value)
                      } else {
                        setAvailableSlots([])
                        setSelectedTimeSlot('')
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    minDate={new Date()} // prevent past dates
                    disabled={scheduling || loadingSlots}
                    className="w-full"
                  />
                </div>

                {loadingSlots && (
                  <div className="flex items-center justify-center py-4">
                    <IconLoader2 className="w-6 h-6 animate-spin text-foreground" />
                    <span className="ml-2 text-sm">Loading available slots...</span>
                  </div>
                )}

                {!loadingSlots && selectedDate && availableSlots.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                      Select Time Slot *
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`text-sm font-medium neumorphic-pressed text-foreground rounded-lg cursor-pointer transition-all duration-200 px-2 py-2 border ${selectedTimeSlot === slot
                            ? 'border-2 border-primary'
                            : ''
                            }`}
                          disabled={scheduling}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingSlots && selectedDate && availableSlots.length === 0 && (
                  <div className="text-center py-4 text-sm text-foreground">
                    No available time slots for this date.
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowRescheduleModal(false)
                      setRescheduleAppointmentId(null)
                      setSelectedDate('')
                      setAvailableSlots([])
                      setSelectedTimeSlot('')
                    }}
                    disabled={scheduling || loadingSlots}
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRescheduleAppointmentSubmit}
                    disabled={scheduling || loadingSlots || !selectedDate || !selectedTimeSlot}
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scheduling ? (
                      <span className="flex items-center justify-center">
                        <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                        Rescheduling...
                      </span>
                    ) : (
                      'Reschedule'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            if (!cancelling) {
              setShowCancelConfirm(false)
              setCancelAppointmentId(null)
            }
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-sm mx-auto bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold mb-2">Cancel Appointment</h2>
                <p className="text-sm text-foreground">
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(false)
                    setCancelAppointmentId(null)
                  }}
                  disabled={cancelling}
                  className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  No, Keep It
                </Button>
                <Button
                  onClick={confirmCancelAppointment}
                  disabled={cancelling}
                  className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center">
                      <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[10000] neumorphic-pressed rounded-lg p-4 min-w-[300px] max-w-[400px] bg-background shadow-lg animate-in slide-in-from-top-5 ${toast.type === 'success'
            ? 'border-l-4 border-green-500'
            : toast.type === 'error'
              ? 'border-l-4 border-destructive'
              : 'border-l-4 border-primary'
            }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${toast.type === 'success'
                  ? 'text-green-700 dark:text-green-400'
                  : toast.type === 'error'
                    ? 'text-destructive'
                    : 'text-foreground'
                  }`}
              >
                {toast.message}
              </p>
            </div>
            <Button
              onClick={() => setToast(null)}
              className="text-foreground hover:text-foreground transition-colors"
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </>
  )

  if (viewMode === 'profile' && selectedPatient) {
    return (
      <>
        <div className="space-y-6">
          {/* Profile Header with Back Button */}
          <div className="px-4 lg:px-6">
            <Button
              onClick={handleCloseProfile}
              size="sm"
              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
            >
              <IconArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Patients</span>
            </Button>
          </div>

          {/* Loading State */}
          {profileLoading && (
            <div className="flex items-center justify-center py-12">
              <IconLoader2 className="w-8 h-8 animate-spin text-foreground" />
            </div>
          )}

          {/* Error State */}
          {profileError && (
            <div className="px-4 lg:px-6">
              <div className="max-w-4xl mx-auto neumorphic-inset p-4 rounded-lg bg-destructive/10">
                <p className="text-sm text-destructive">{profileError}</p>
              </div>
            </div>
          )}

          {/* Patient Profile Content */}
          {!profileLoading && (
            <div className="px-4 lg:px-6">
              <div className="max-w-4xl mx-auto neumorphic-inset p-6 rounded-lg">
                {/* Patient Info */}
                <div className="rounded-lg mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold bg-primary/10">
                      {`${selectedPatient.first_name[0]}${selectedPatient.last_name[0]}`.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold">{`${selectedPatient.first_name} ${selectedPatient.last_name}`}</h1>
                      <p className="text-sm">Patient ID: {selectedPatient.id}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone Number
                      </label>
                      <div className="font-medium text-foreground">
                        {selectedPatient.phone_number}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Date of Birth
                      </label>
                      <div className="font-medium text-foreground">
                        {calculateAge(selectedPatient.dob)} years old ({formatDate(selectedPatient.dob)})
                      </div>
                    </div>

                    {selectedPatient.email && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email
                        </label>
                        <div className="font-medium text-foreground">
                          {selectedPatient.email}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guardian Information */}
                {selectedPatient?.guardians && selectedPatient.guardians.length > 0 && (
                  <div className="rounded-lg mb-6">
                    <h3 className="text-lg font-semibold mb-4">Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Guardian Name
                        </label>
                        <div className="font-medium text-foreground">
                          {`${selectedPatient.guardians[0].first_name} ${selectedPatient.guardians[0].last_name}`}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Date of Birth
                        </label>
                        <div className="font-medium text-foreground">
                          {formatDate(selectedPatient.guardians[0].dob)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Relationship to Patient
                        </label>
                        <div className="font-medium text-foreground">
                          {selectedPatient.guardians[0].relationship_to_patient || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div className="rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Documents</h3>
                  {selectedPatient?.documents && selectedPatient.documents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPatient.documents.map((doc, index) => {
                        const docId = doc.document_id || doc.id || index
                        const isDownloading = downloadingDoc === docId
                        const isViewing = viewingDoc === docId

                        return (
                          <div
                            key={docId}
                            className="flex items-center justify-between p-3 neumorphic-inset rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-sm">{doc.type}</div>
                              {doc.title && (
                                <div className="text-xs text-foreground">{doc.title}</div>
                              )}
                              {doc.description && (
                                <div className="text-xs text-foreground">{doc.description}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleViewDocument(doc)}
                                disabled={isViewing}
                                className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                              >
                                {isViewing ? (
                                  <>
                                    <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                                    Opening...
                                  </>
                                ) : (
                                  'View'
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDownloadDocument(doc)}
                                disabled={isDownloading}
                                className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                              >
                                {isDownloading ? (
                                  <>
                                    <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                                    Downloading...
                                  </>
                                ) : (
                                  'Download'
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 neumorphic-inset rounded-lg">
                      <p className="text-sm mb-2">No documents uploaded</p>
                      <p className="text-xs">This patient has not uploaded any documents yet.</p>
                    </div>
                  )}
                </div>

                {/* Upcoming Appointments */}
                <div className="rounded-lg mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Upcoming Appointments{" "}
                      {selectedPatient?.appointments?.upcoming &&
                        selectedPatient.appointments.upcoming.length > 0
                        ? `(${selectedPatient.appointments.upcoming.length})`
                        : ""}
                    </h3>
                    <Button
                      onClick={handleSchedule}
                      className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                    >
                      Schedule
                    </Button>
                  </div>
                  {selectedPatient?.appointments?.upcoming && selectedPatient.appointments.upcoming.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPatient.appointments.upcoming.map((appointment, index) => (
                        <div key={index} className="neumorphic-inset rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-foreground">
                              {formatDateUSShort(appointment.date)}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium neumorphic-inset">
                              {appointment.status}
                            </span>
                          </div>
                          <p className="text-sm mb-4">
                            {appointment.time}
                          </p>
                          <div className="flex justify-center items-center gap-3">
                            <Button
                              onClick={() => handleRescheduleAppointment(appointment.appointment_id)}
                              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                            >
                              Reschedule
                            </Button>
                            <Button
                              onClick={() => handleCancelAppointment(appointment.appointment_id)}
                              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 neumorphic-inset rounded-lg">
                      <p className="text-sm mb-2">No upcoming appointments</p>
                      <p className="text-xs">This patient has no upcoming appointments.</p>
                    </div>
                  )}
                </div>

                {/* Past Appointments */}
                <div className="rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Past Appointments</h3>
                  {selectedPatient?.appointments?.past && selectedPatient.appointments.past.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPatient.appointments.past.map((appointment, index) => (
                        <div
                          key={index}
                          className="neumorphic-inset rounded-lg p-4 flex justify-between items-center"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground text-base">
                              {formatDateUSShort(appointment.date)}
                            </span>
                            <span className="text-sm">
                              {appointment.time}
                            </span>
                          </div>
                          <span
                            className={`
                            inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                            ${appointment.status && appointment.status.toLowerCase() === "completed"
                                ? "bg-green-100"
                                : appointment.status && appointment.status.toLowerCase() === "cancelled"
                                  ? "bg-destructive/20"
                                  : "bg-primary/10"
                              }
                            neumorphic-inset
                          `}
                          >
                            {appointment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 neumorphic-inset rounded-lg">
                      <p className="text-sm mb-2">No past appointments</p>
                      <p className="text-xs">This patient has no appointment history.</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center items-center">
                  <Button
                    onClick={handleDownloadProfile}
                    className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Download Profile
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {renderModals()}
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Patients Table */}
        <div className="px-4 lg:px-6">
          {/* Header with title, filter and Add Patient button */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Patients {loading ? '' : `(${filteredPatients.length})`}
            </h2>
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 max-w-[160px]"
            >
              Add Patient
            </Button>
          </div>

          {/* Full-page Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-lg">Loading patients...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-4">{error}</div>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Patients Table */}
          {!loading && (
            <div className="neumorphic-inset rounded-lg p-4 border-0">
              <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
                {filteredPatients.length > 0 ? (
                  <table className="w-full text-sm table-fixed">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b-2 border-muted/90 bg-muted/10">
                        {/* <th className="text-left font-medium py-3 px-4 w-1/5">Patient ID</th> */}
                        <th className="text-left font-medium py-3 px-4 w-1/5">Patient Name</th>
                        <th className="text-left font-medium py-3 px-4 w-1/5">DOB</th>
                        <th className="text-left font-medium py-3 px-4 w-1/5">Contact</th>
                        <th className="text-left font-medium py-3 px-4 w-1/5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-muted/90">
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                          {/* <td className="py-3 px-4 font-medium text-sm">{patient.id}</td> */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <IconUserCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{`${patient.first_name} ${patient.last_name}`}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{formatDate(patient.dob)}</td>
                          <td className="py-3 px-4 text-sm">{patient.phone_number}</td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={() => handleViewProfile(patient)}
                              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                            >
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-foreground">No patients found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Patient Modal */}
        {showAddForm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-4"
            onClick={() => {
              if (!submitting) {
                setShowAddForm(false)
                setSubmitError(null)
                setFormData({
                  firstName: '',
                  middleName: '',
                  lastName: '',
                  dob: '',
                  phoneNumber: '',
                  guardianFirstName: '',
                  guardianMiddleName: '',
                  guardianLastName: '',
                  guardianDob: '',
                  guardianRelationship: ''
                })
                setFormErrors({
                  firstName: '',
                  middleName: '',
                  lastName: '',
                  dob: '',
                  phoneNumber: '',
                  guardianFirstName: '',
                  guardianMiddleName: '',
                  guardianLastName: '',
                  guardianDob: '',
                  guardianRelationship: ''
                })
              }
            }}
          >
            <div
              className="neumorphic-pressed rounded-lg w-full max-w-xl mx-auto max-h-[90vh] bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">Add New Patient</h2>
                  <Button
                    onClick={() => {
                      setShowAddForm(false)
                      setSubmitError(null)
                      setFormData({
                        firstName: '',
                        middleName: '',
                        lastName: '',
                        dob: '',
                        phoneNumber: '',
                        guardianFirstName: '',
                        guardianMiddleName: '',
                        guardianLastName: '',
                        guardianDob: '',
                        guardianRelationship: ''
                      })
                      setFormErrors({
                        firstName: '',
                        middleName: '',
                        lastName: '',
                        dob: '',
                        phoneNumber: '',
                        guardianFirstName: '',
                        guardianMiddleName: '',
                        guardianLastName: '',
                        guardianDob: '',
                        guardianRelationship: ''
                      })
                    }}
                    disabled={submitting}
                    className="w-8 h-8 flex items-center justify-center text-lg font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200"
                  >
                    ×
                  </Button>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive">{submitError}</p>
                  </div>
                )}

                <form onSubmit={handleAddPatient} className="space-y-3">
                  {/* Name Fields - All in one row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={(e) => {
                          const { value, error } = validateNameInput(e.target.value)
                          setFormData({ ...formData, firstName: value })
                          setFormErrors({ ...formErrors, firstName: error })
                        }}
                        className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.firstName ? 'ring-2 ring-red-500' : ''}`}
                        required
                        disabled={submitting}
                      />
                      {formErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={formData.middleName}
                        onChange={(e) => {
                          const { value, error } = validateNameInput(e.target.value)
                          setFormData({ ...formData, middleName: value })
                          setFormErrors({ ...formErrors, middleName: error })
                        }}
                        className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.middleName ? 'ring-2 ring-red-500' : ''}`}
                        disabled={submitting}
                      />
                      {formErrors.middleName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.middleName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={formData.lastName}
                        onChange={(e) => {
                          const { value, error } = validateNameInput(e.target.value)
                          setFormData({ ...formData, lastName: value })
                          setFormErrors({ ...formErrors, lastName: error })
                        }}
                        className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.lastName ? 'ring-2 ring-red-500' : ''}`}
                        required
                        disabled={submitting}
                      />
                      {formErrors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* DOB and Phone Number - In one row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                        Date of Birth *
                      </label>
                      <DatePicker
                        value={formData.dob}
                        onChange={(value) => setFormData({ ...formData, dob: value })}
                        placeholder="MM/DD/YYYY"
                        disabled={submitting}
                        required
                        maxDate={new Date()} // Prevent future dates
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                        Phone Number *
                      </label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 py-2 text-sm neumorphic-inset rounded-l-md bg-muted/50 border-r border-border">
                          +1
                        </span>
                        <input
                          type="tel"
                          placeholder="(XXX) XXX-XXXX"
                          value={formData.phoneNumber}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '') // Remove non-digits
                            if (value.length > 10) value = value.slice(0, 10) // Limit to 10 digits

                            // Format as (XXX) XXX-XXXX
                            if (value.length >= 6) {
                              value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
                            } else if (value.length >= 3) {
                              value = `(${value.slice(0, 3)}) ${value.slice(3)}`
                            } else if (value.length > 0) {
                              value = `(${value}`
                            }

                            setFormData({ ...formData, phoneNumber: value })
                          }}
                          className="flex-1 px-3 py-2 text-sm neumorphic-inset rounded-r-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          required
                          disabled={submitting}
                          maxLength={14} // (XXX) XXX-XXXX = 14 characters
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guardian Information - shown when patient is under 18 */}
                  {isPatientMinor(formData.dob) && (
                    <div className="space-y-2 pt-3 border-t border-border">
                      <h2 className="mb-4 text-base font-semibold">Guardian Information* (Patient is a minor)</h2>

                      {/* Guardian Name Fields - All in one row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Enter first name"
                            value={formData.guardianFirstName}
                            onChange={(e) => {
                              const { value, error } = validateNameInput(e.target.value)
                              setFormData({ ...formData, guardianFirstName: value })
                              setFormErrors({ ...formErrors, guardianFirstName: error })
                            }}
                            className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.guardianFirstName ? 'ring-2 ring-red-500' : ''}`}
                            required={isPatientMinor(formData.dob)}
                            disabled={submitting}
                          />
                          {formErrors.guardianFirstName && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.guardianFirstName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter middle name"
                            value={formData.guardianMiddleName}
                            onChange={(e) => {
                              const { value, error } = validateNameInput(e.target.value)
                              setFormData({ ...formData, guardianMiddleName: value })
                              setFormErrors({ ...formErrors, guardianMiddleName: error })
                            }}
                            className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.guardianMiddleName ? 'ring-2 ring-red-500' : ''}`}
                            disabled={submitting}
                          />
                          {formErrors.guardianMiddleName && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.guardianMiddleName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Enter last name"
                            value={formData.guardianLastName}
                            onChange={(e) => {
                              const { value, error } = validateNameInput(e.target.value)
                              setFormData({ ...formData, guardianLastName: value })
                              setFormErrors({ ...formErrors, guardianLastName: error })
                            }}
                            className={`w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${formErrors.guardianLastName ? 'ring-2 ring-red-500' : ''}`}
                            required={isPatientMinor(formData.dob)}
                            disabled={submitting}
                          />
                          {formErrors.guardianLastName && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.guardianLastName}</p>
                          )}
                        </div>
                      </div>

                      {/* Guardian DOB and Relationship - In one row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                            Guardian Date of Birth *
                          </label>
                          <DatePicker
                            value={formData.guardianDob}
                            onChange={(value) => setFormData({ ...formData, guardianDob: value })}
                            placeholder="MM/DD/YYYY"
                            required={isPatientMinor(formData.dob)}
                            disabled={submitting}
                            maxDate={new Date()} // Prevent future dates
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                            Relationship to Patient *
                          </label>
                          <select
                            value={formData.guardianRelationship}
                            onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                            className="w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                            required={isPatientMinor(formData.dob)}
                            disabled={submitting}
                          >
                            <option value="">Select relationship</option>
                            <option value="Parent">Parent</option>
                            <option value="Spouse">Spouse (Husband/Wife)</option>
                            <option value="Grandparent">Grandparent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Aunt">Aunt</option>
                            <option value="Uncle">Uncle</option>
                            <option value="Cousin">Cousin</option>
                            <option value="Guardian">Guardian</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setSubmitError(null)
                        setFormData({
                          firstName: '',
                          middleName: '',
                          lastName: '',
                          dob: '',
                          phoneNumber: '',
                          guardianFirstName: '',
                          guardianMiddleName: '',
                          guardianLastName: '',
                          guardianDob: '',
                          guardianRelationship: ''
                        })
                        setFormErrors({
                          firstName: '',
                          middleName: '',
                          lastName: '',
                          dob: '',
                          phoneNumber: '',
                          guardianFirstName: '',
                          guardianMiddleName: '',
                          guardianLastName: '',
                          guardianDob: '',
                          guardianRelationship: ''
                        })
                      }}
                      disabled={submitting}
                      className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg cursor-pointer transition-all duration-200 px-3 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center">
                          <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                          Adding...
                        </span>
                      ) : (
                        'Add Patient'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderModals()}
    </>
  )
}
