import { useState } from "react"
import { IconArrowLeft, IconUserCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { formatDateUS, formatDateUSShort } from "@/lib/date"

// Static sample patients for admin (demo purposes)
// TODO: Replace with admin API when available
const patients = [
  {
    first_name: "Samantha",
    last_name: "Reeves",
    dob: "1977-08-14",
    phone_number: "+14152223344",
    clinic_id: 56,
    status: "active",
    id: 290,
    guardians: [
      {
        clinic_id: 56,
        first_name: "Jessica",
        last_name: "Reeves",
        dob: "1972-03-25",
        relationship_to_patient: "sister",
        id: 31
      }
    ],
    documents: [
      {
        document_id: 12,
        title: "Insurance Card",
        type: "insurance",
        uploaded_at: "2024-04-02T14:12:00Z"
      }
    ],
    appointments: {
      upcoming: [
        { date: "2025-11-14", time: "10:15 AM", status: "Scheduled" }
      ],
      past: [
        { date: "2024-12-01", time: "03:00 PM", status: "Completed" }
      ]
    }
  },
  {
    first_name: "Oliver",
    last_name: "Harper",
    dob: "1986-09-22",
    phone_number: "+12025550123",
    clinic_id: 56,
    status: "inactive",
    id: 897,
    guardians: [],
    documents: [],
    appointments: {
      upcoming: [],
      past: [
        { date: "2023-08-19", time: "01:45 PM", status: "Cancelled" }
      ]
    }
  },
  {
    first_name: "Emily",
    last_name: "Zhang",
    dob: "2015-05-11",
    phone_number: "+14705557890",
    clinic_id: 56,
    status: "active",
    id: 614,
    guardians: [
      {
        clinic_id: 56,
        first_name: "Wei",
        last_name: "Zhang",
        dob: "1979-12-02",
        relationship_to_patient: "mother",
        id: 77
      }
    ],
    documents: [],
    appointments: {
      upcoming: [],
      past: []
    }
  },
  {
    first_name: "Michael",
    last_name: "Smith",
    dob: "2000-09-22",
    phone_number: "+14848001855",
    clinic_id: 56,
    status: "active",
    id: 489,
    guardians: [],
    documents: [],
    appointments: {
      upcoming: [],
      past: []
    }
  },
  {
    first_name: "Jonas",
    last_name: "Kahnwald",
    dob: "2000-08-06",
    phone_number: "+916305128196",
    clinic_id: 56,
    status: "active",
    id: 453,
    guardians: [],
    documents: [],
    appointments: {
      upcoming: [],
      past: []
    }
  }
]

type Patient = typeof patients[number]

export function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
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
            className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                        >
                          View
                        </Button>
                        <Button
                          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
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
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                        >
                          Reschedule
                        </Button>
                        <Button
                          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
        {/* Header with title and Add Patient button */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Patients ({patients.length})</h2>
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 max-w-[160px]"
          >
            Add Patient
          </Button>
        </div>
        <div className="neumorphic-inset rounded-lg p-4 border-0">

          <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b-2 border-muted/90 bg-muted/10">
                  <th className="text-left font-medium py-3 px-2">Patient ID</th>
                  <th className="text-left font-medium py-3 px-2">Patient Name</th>
                  <th className="text-left font-medium py-3 px-2">DOB</th>
                  <th className="text-left font-medium py-3 px-2">Contact</th>
                  <th className="text-left font-medium py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-muted/90">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium text-sm">{patient.id}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <IconUserCircle className="w-5 h-5" />
                        <span className="font-medium text-sm">{`${patient.first_name} ${patient.last_name}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm">{formatDate(patient.dob)}</td>
                    <td className="py-3 px-2 text-sm">{patient.phone_number}</td>
                    <td className="py-3 px-2">
                      <Button
                        onClick={() => handleViewProfile(patient)}
                        className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-sm mx-auto max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Add New Patient</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="text"
                    placeholder="dd-mm-yyyy"
                    className="w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2">
                    Phone Number *
                  </label>
                  <div className="flex">
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      className="flex-1 px-3 py-2 text-sm neumorphic-inset rounded-r-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <Button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
