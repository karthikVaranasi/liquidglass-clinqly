import { useState, useEffect } from "react"
import { IconArrowLeft, IconUserCircle, IconFilter } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateUS, formatDateUSShort, getCurrentDateInLocal } from "@/lib/date"
import { AdminPatientsAPI, AdminClinicsAPI } from "@/api/admin"
import type { Patient, Guardian } from "@/api/shared/types"

interface ExtendedPatient extends Patient {
  documents?: Array<{
    document_id?: number
    id?: number
    type: string
    title?: string
    description?: string
    uploaded_at?: string
    url?: string
    file_url?: string
    document_url?: string
  }>
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
import type { Clinic } from "@/api/admin/clinics"


export function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<ExtendedPatient | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Clinics state
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all')

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
        setError('Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter patients when clinic selection changes
  useEffect(() => {
    if (selectedClinicId === 'all') {
      setFilteredPatients(allPatients)
    } else {
      const clinicId = parseInt(selectedClinicId)
      const filtered = allPatients.filter(patient => patient.clinic_id === clinicId)
      setFilteredPatients(filtered)
    }
  }, [selectedClinicId, allPatients])

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
  const handleViewProfile = (patient: Patient) => {
    setSelectedPatient(patient)
    setViewMode('profile')
  }

  const handleCloseProfile = () => {
    setSelectedPatient(null)
    setViewMode('table')
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

        {/* Patient Profile Content */}
        <div className="px-4 lg:px-6">
          <div className="max-w-4xl mx-auto neumorphic-inset p-6 rounded-lg">
            {/* Patient Info */}
            <div className="rounded-lg mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold">
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
                      {selectedPatient.guardians[0].relationship_to_patient}
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
                  {selectedPatient.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 neumorphic-inset rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-sm">{doc.type}</div>
                        {"title" in doc && (
                          <div className="text-xs">
                            {(doc as { title: string }).title}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                        >
                          View
                        </Button>
                        <Button
                          className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 neumorphic-inset rounded-lg">
                  <p className="text-sm mb-2">No documents uploaded</p>
                  <p className="text-xs">
                    This patient has not uploaded any documents yet.
                  </p>
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
                          className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                        >
                          Reschedule
                        </Button>
                        <Button
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
                  <p className="text-xs">
                    This patient has no upcoming appointments.
                  </p>
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
                className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
              >
                Download Profile
              </Button>
            </div>
          </div>
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
            {/* Provider Filter */}
            <div className="flex items-center gap-2 mb-3">
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
          {/* </div>
        </div> */}
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          {error && (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm mb-2">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
              >
                Try Again
              </Button>
            </div>
          )}

          {!error && (
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
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center">
                        <div className="text-sm">Loading patients...</div>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
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
                            className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
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
          )}
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
                <Button
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
                  className="w-8 h-8 flex items-center justify-center text-lg font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200"
                >
                  ×
                </Button>
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
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground hover:bg-destructive rounded-lg cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg cursor-pointer transition-all duration-200 px-3 py-2"
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
