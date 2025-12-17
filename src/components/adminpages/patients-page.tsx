import { useState, useEffect } from "react"
import {
  IconArrowLeft,
  IconUserCircle,
  IconFilter,
  IconSearch,
  IconLoader2,
  IconPhone,
  IconCalendar,
  IconMail,
  IconUsers,
  IconFileText,
  IconCalendarEvent,
  IconHistory,
  IconX
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { formatDateUS, formatDateUSShort, getCurrentDateInLocal } from "@/lib/date"
import { getErrorMessage, getToastErrorMessage } from "@/lib/errors"
import { AdminPatientsAPI, AdminClinicsAPI } from "@/api/admin"
import type { Patient, Guardian } from "@/api/shared/types"

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
  email?: string
  guardians?: Guardian[]
  documents?: PatientDocument[]
  appointments?: {
    upcoming: Array<{
      date: string
      time: string
      status: string
      appointment_id: number
      reason_for_visit?: string
      appointment_note?: string
      duration?: number
    }>
    past: Array<{
      date: string
      time: string
      status: string
      appointment_id: number
      reason_for_visit?: string
      appointment_note?: string
      duration?: number
    }>
  }
}
import type { Clinic } from "@/api/admin/clinics"


export function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<ExtendedPatient | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Document loading states
  const [downloadingDoc, setDownloadingDoc] = useState<number | null>(null)
  const [viewingDoc, setViewingDoc] = useState<number | null>(null)

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Clinics state
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Fetch clinics and patients data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch both clinics and patients in parallel
        const [clinicsData, patientsData] = await Promise.all([
          AdminClinicsAPI.getAllClinics().catch(() => []),
          AdminPatientsAPI.getAllPatients() // Fetch all patients without clinic filter
        ])

        setClinics(clinicsData)
        setAllPatients(patientsData)
        setFilteredPatients(patientsData) // Initially show all patients
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError(getErrorMessage(err, 'data'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter patients when clinic selection or search query changes
  useEffect(() => {
    let filtered = allPatients

    // Filter by clinic
    if (selectedClinicId !== 'all') {
      const clinicId = parseInt(selectedClinicId)
      filtered = filtered.filter(patient => patient.clinic_id === clinicId)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(patient => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
        const phone = patient.phone_number.toLowerCase()
        const dob = formatDate(patient.dob).toLowerCase()

        return fullName.includes(query) || phone.includes(query) || dob.includes(query)
      })
    }

    setFilteredPatients(filtered)
  }, [selectedClinicId, allPatients, searchQuery])

  // Helper function to validate name input with user-friendly error messages
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
    phoneNumber: ''
  })

  // Form validation errors
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    phoneNumber: ''
  })

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

  const formatDate = (dateString: string) => {
    return formatDateUS(dateString)
  }

  // Render modals - toast notification for admin
  const renderModals = () => (
    <>
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
              className="neumorphic-button-destructive w-7 h-7 p-0 rounded-full"
            >
              <IconX />
            </Button>
          </div>
        </div>
      )}
    </>
  )
  const handleViewProfile = async (patient: Patient) => {
    try {
      setProfileLoading(true)
      setProfileError(null)
      setViewMode('profile')

      // For admin, documents and appointments might not be available via API
      // We'll set empty arrays for now and handle them gracefully
      const documentsData: PatientDocument[] = []
      const appointmentsData: any[] = []

      const extendedPatient: ExtendedPatient = {
        ...(patient as any),
        documents: documentsData,
        appointments: appointmentsData ? transformAppointments(appointmentsData) : { upcoming: [], past: [] }
      }

      setSelectedPatient(extendedPatient)
    } catch (err) {
      console.error('Failed to fetch patient profile:', err)
      setProfileError(getErrorMessage(err, 'data'))
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
        appointment_time: appt.appointment_time,
        appointment_note: appt.appointment_note || '',
        reason_for_visit: appt.reason_for_visit || '',
        duration: appt.duration || null
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

  const handleCloseProfile = () => {
    setSelectedPatient(null)
    setViewMode('table')
    setProfileError(null)
  }

  const handleViewDocument = async (doc: PatientDocument) => {
    if (!doc || !selectedPatient) return

    setViewingDoc(doc.document_id || doc.id || null)

    try {
      // For admin, we might not have the view document API, so we'll just open in new tab if URL exists
      if (doc.url || doc.file_url || doc.document_url) {
        const url = doc.url || doc.file_url || doc.document_url
        window.open(url, '_blank')
      } else {
        showToast('Document URL not available', 'error')
      }
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
      // For admin, we might not have the download document API, so we'll just trigger download if URL exists
      const url = doc.url || doc.file_url || doc.document_url
      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = `${doc.type}_${doc.title || 'document'}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        showToast('Document download not available', 'error')
      }
    } catch (err) {
      console.error('Failed to download document:', err)
      showToast(getToastErrorMessage(err, 'data', 'Failed to download document. Please try again.'), 'error')
    } finally {
      setDownloadingDoc(null)
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
        email: selectedPatient.email || '',
        status: selectedPatient.status || 'active'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    // Reset form
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      phoneNumber: ''
    })
    setShowAddForm(false)
  }


  if (viewMode === 'profile' && selectedPatient) {
    return (
      <>
        <div className="min-h-screen">
          {/* Navigation Bar */}
          <div className="sticky top-0 z-40 backdrop-blur-md bg-background/90">
            <div className="px-4 lg:px-6 py-3">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Button
                  onClick={handleCloseProfile}
                  size="sm"
                  className="neumorphic-button-primary rounded-full"
                >
                  <IconArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back to Patients</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {profileLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <IconLoader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Loading patient profile...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {profileError && (
            <div className="px-4 lg:px-6 py-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 p-6 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-lg font-bold">!</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-700 mb-1">Error Loading Profile</h3>
                      <p className="text-sm text-red-600">{profileError}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Patient Profile Content */}
          {!profileLoading && !profileError && (
            <div className="px-4 lg:px-6 py-6">
              <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Row - Patient / Guardian / Documents (one row on large screens) */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Patient */}
                  <div
                    className={`col-span-12 ${(selectedPatient?.guardians?.length ?? 0) > 0 ? 'lg:col-span-4' : 'lg:col-span-6'}`}
                  >
                    <div className="neumorphic-inset rounded-2xl p-5 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-transparent to-teal-50/30 flex flex-col lg:h-[220px]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <IconUserCircle className="w-4 h-4 text-emerald-700" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Patient</p>
                      </div>

                      <div className="space-y-3 flex-1">
                        <div>
                          <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Name</p>
                          <p className="text-sm font-semibold text-foreground">
                            {`${selectedPatient.first_name} ${selectedPatient.last_name}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Date of Birth</p>
                          <p className="text-sm font-semibold text-foreground">{formatDate(selectedPatient.dob)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Phone</p>
                          <p className="text-sm font-semibold text-foreground break-all">{selectedPatient.phone_number}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guardian (skip entirely if none) */}
                  {(selectedPatient?.guardians?.length ?? 0) > 0 && (
                    <div className="col-span-12 lg:col-span-4">
                      <div className="neumorphic-inset rounded-2xl p-5 border-2 border-violet-300 bg-gradient-to-br from-violet-50/40 via-transparent to-purple-50/30 flex flex-col lg:h-[220px]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                            <IconUsers className="w-4 h-4 text-violet-700" />
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                            Guardian{(selectedPatient?.guardians?.length ?? 0) > 1 ? ` (${selectedPatient.guardians?.length})` : ''}
                          </p>
                        </div>

                        <div className="divide-y divide-violet-200/40 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
                          {selectedPatient.guardians?.map((g) => (
                            <div key={g.id} className="py-3 first:pt-0 last:pb-0">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Name</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {`${g.first_name} ${g.last_name}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Date of Birth</p>
                                  <p className="text-sm font-semibold text-foreground">{formatDate(g.dob)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wide">Relationship</p>
                                  <p className="text-sm font-semibold text-foreground capitalize">{g.relationship_to_patient}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div
                    className={`col-span-12 ${(selectedPatient?.guardians?.length ?? 0) > 0 ? 'lg:col-span-4' : 'lg:col-span-6'}`}
                  >
                    <div className="neumorphic-inset rounded-2xl p-5 border-2 border-amber-300 bg-gradient-to-br from-amber-50/40 via-transparent to-orange-50/30 flex flex-col lg:h-[220px]">
                      <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <IconFileText className="w-4 h-4 text-amber-600" />
                        </div>
                        Documents
                        {(selectedPatient?.documents?.length ?? 0) > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs font-semibold">
                            {selectedPatient?.documents?.length ?? 0}
                          </span>
                        )}
                      </h3>

                      <div className="flex-1 min-h-0">
                        {(selectedPatient?.documents?.length ?? 0) > 0 ? (
                          <div className="space-y-3 h-full overflow-y-auto pr-1 -mr-1">
                            {selectedPatient.documents?.map((doc, index) => {
                              const docId = doc.document_id || doc.id || index
                              const isDownloading = downloadingDoc === docId
                              const isViewing = viewingDoc === docId

                              return (
                                <div key={index} className="p-3 rounded-xl bg-white/50 border border-amber-100/50 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-foreground text-sm truncate flex-1">
                                      {doc.type}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-700 text-[10px] font-semibold uppercase">
                                      Doc
                                    </span>
                                  </div>
                                  {doc.title && (
                                    <p className="text-xs text-foreground/60 mb-2 truncate">{doc.title}</p>
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleViewDocument(doc)}
                                      disabled={isViewing}
                                      size="sm"
                                      className="flex-1 neumorphic-button-primary text-xs"
                                    >
                                      {isViewing ? <IconLoader2 className="w-3 h-3 animate-spin" /> : 'View'}
                                    </Button>
                                    <Button
                                      onClick={() => handleDownloadDocument(doc)}
                                      disabled={isDownloading}
                                      size="sm"
                                      className="flex-1 neumorphic-button-primary text-xs"
                                    >
                                      {isDownloading ? <IconLoader2 className="w-3 h-3 animate-spin" /> : 'Download'}
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-100/50 flex items-center justify-center mx-auto mb-3">
                              <IconFileText className="w-6 h-6 text-amber-400" />
                            </div>
                            <p className="text-sm font-medium text-foreground/70">No Documents</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Appointments */}
                  <div className="col-span-12 space-y-6">

                    {/* Upcoming Appointments */}
                    <div className="neumorphic-inset rounded-2xl p-5 border-2 border-blue-300 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <IconCalendarEvent className="w-4 h-4 text-blue-600" />
                          </div>
                          Upcoming Appointments
                          {(selectedPatient?.appointments?.upcoming?.length ?? 0) > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                              {selectedPatient?.appointments?.upcoming?.length ?? 0}
                            </span>
                          )}
                        </h3>
                      </div>

                      {(selectedPatient?.appointments?.upcoming?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {selectedPatient.appointments?.upcoming?.map((appointment, index) => (
                            <div
                              key={index}
                              className="rounded-xl bg-white/60 border-2 border-blue-100/80 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                            >
                              <div className="flex items-center gap-4 p-4">
                                {/* Date block */}
                                <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 min-w-[70px]">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                                    {formatDateUSShort(appointment.date).split(' ')[0]}
                                  </span>
                                  <span className="text-2xl font-bold leading-tight text-blue-700">
                                    {new Date(appointment.date).getDate()}
                                  </span>
                                </div>

                                {/* Time */}
                                <div className="flex-1">
                                  <span className="text-lg font-bold text-foreground">{appointment.time}</span>
                                </div>
                              </div>
                              <div className="border-t border-blue-100/50">
                                <Accordion type="multiple" className="w-full">
                                  <AccordionItem value={`reason-${appointment.appointment_id}`} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                      Reason for Visit
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-3">
                                      <span className="text-sm text-foreground/80">
                                        {appointment.reason_for_visit || 'Not provided'}
                                      </span>
                                    </AccordionContent>
                                  </AccordionItem>
                                  <AccordionItem value={`notes-${appointment.appointment_id}`} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                      Appointment Notes
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-3">
                                      <span className="text-sm text-foreground/80">
                                        {appointment.appointment_note || 'No notes added'}
                                      </span>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-blue-100/50 flex items-center justify-center mx-auto mb-3">
                            <IconCalendarEvent className="w-6 h-6 text-blue-400" />
                          </div>
                          <p className="text-sm font-medium text-foreground/70">No Upcoming Appointments</p>
                        </div>
                      )}
                    </div>

                    {/* Past Appointments */}
                    <div className="neumorphic-inset rounded-2xl p-5 border-2 border-slate-300 bg-gradient-to-br from-slate-50/40 via-transparent to-gray-50/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <IconHistory className="w-4 h-4 text-slate-600" />
                          </div>
                          Past Appointments
                          {(selectedPatient?.appointments?.past?.length ?? 0) > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                              {selectedPatient?.appointments?.past?.length ?? 0}
                            </span>
                          )}
                        </h3>
                      </div>

                      {(selectedPatient?.appointments?.past?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {selectedPatient.appointments?.past?.map((appointment, index) => (
                            <div
                              key={index}
                              className="rounded-xl bg-white/60 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                            >
                              <div className="flex items-center gap-4 p-4">
                                {/* Date block */}
                                <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-br from-slate-100 to-gray-100 min-w-[70px]">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {formatDateUSShort(appointment.date).split(' ')[0]}
                                  </span>
                                  <span className="text-2xl font-bold leading-tight text-slate-700">
                                    {new Date(appointment.date).getDate()}
                                  </span>
                                </div>

                                {/* Time and status */}
                                <div className="flex-1">
                                  <span className="text-lg font-bold text-foreground">{appointment.time}</span>
                                </div>

                                {/* Status badge */}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${appointment.status?.toLowerCase() === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : appointment.status?.toLowerCase() === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {appointment.status}
                                </span>
                              </div>
                              <div className="border-t border-slate-100/50">
                                <Accordion type="multiple" className="w-full">
                                  <AccordionItem value={`past-reason-${appointment.appointment_id}`} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                      Reason for Visit
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-3">
                                      <span className="text-sm text-foreground/80">
                                        {appointment.reason_for_visit || 'Not provided'}
                                      </span>
                                    </AccordionContent>
                                  </AccordionItem>
                                  <AccordionItem value={`past-notes-${appointment.appointment_id}`} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                                      Appointment Notes
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-3">
                                      <span className="text-sm text-foreground/80">
                                        {appointment.appointment_note || 'No notes added'}
                                      </span>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-slate-100/50 flex items-center justify-center mx-auto mb-3">
                            <IconHistory className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-foreground/70">No Past Appointments</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {renderModals()}
      </>
    )
  }

  // Show full-page loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading patients...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button
            onClick={() => window.location.reload()}
            className="neumorphic-button-primary"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Patients Table */}
      <div className="px-4 lg:px-6">
        {/* Header with title, filter and Add Patient button */}
        {/* <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4"> */}
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-3">
          {/* Search - Left */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, phone, or DOB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm neumorphic-inset rounded-md border-2 border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Filter - Right */}
          <div className="flex items-center gap-2">
            <IconFilter className="w-4 h-4" />
            <label className="text-sm font-medium">Filter by:</label>
            <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
              <SelectTrigger className="w-[200px] neumorphic-inset">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id.toString()}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* </div>
        </div> */}
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b-2 border-muted/90 bg-muted/10">
                  <th className="text-left font-medium py-3 px-4 w-1/4">Patient Name</th>
                  <th className="text-left font-medium py-3 px-4 w-1/4">Date of Birth</th>
                  <th className="text-left font-medium py-3 px-4 w-1/4">Phone Number</th>
                  <th className="text-left font-medium py-3 px-4 w-1/4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-muted/90">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <div className="text-sm">No patients found</div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
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
                          className="neumorphic-button-primary"
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddForm(false)
            setFormData({
              firstName: '',
              middleName: '',
              lastName: '',
              dob: '',
              phoneNumber: ''
            })
            setFormErrors({
              firstName: '',
              middleName: '',
              lastName: '',
              dob: '',
              phoneNumber: ''
            })
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-xl mx-auto max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Add New Patient</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
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
                      required
                      maxDate={new Date()} // Prevent future dates
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                      Phone Number *
                    </label>
                    <div className="flex">
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
                        maxLength={14} // (XXX) XXX-XXXX = 14 characters
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({
                        firstName: '',
                        middleName: '',
                        lastName: '',
                        dob: '',
                        phoneNumber: ''
                      })
                    }}
                    className="flex-1 neumorphic-button-destructive"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 neumorphic-button-primary"
                  >
                    Add Patient
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
