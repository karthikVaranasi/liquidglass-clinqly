import { useState } from "react"
import { IconArrowLeft, IconUserCircle, IconStethoscope } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export function DoctorsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table')

  // Mock doctors data for admin view
  const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      department: "Cardiology",
      email: "sarah.johnson@clinic.com",
      phone: "+1-555-0123",
      clinic_id: 1,
      status: "Active"
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      department: "Neurology",
      email: "michael.chen@clinic.com",
      phone: "+1-555-0124",
      clinic_id: 1,
      status: "Active"
    },
    {
      id: 3,
      name: "Dr. Emily Davis",
      department: "Pediatrics",
      email: "emily.davis@clinic.com",
      phone: "+1-555-0125",
      clinic_id: 2,
      status: "Active"
    }
  ]

  const handleViewProfile = (doctor: any) => {
    setSelectedDoctor(doctor)
    setViewMode('profile')
  }

  const handleCloseProfile = () => {
    setSelectedDoctor(null)
    setViewMode('table')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    setShowAddForm(false)
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
              <IconStethoscope className="w-12 h-12 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedDoctor.name}</h2>
                <p className="text-muted-foreground">{selectedDoctor.department}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedDoctor.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clinic ID</p>
                  <p className="font-medium">{selectedDoctor.clinic_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedDoctor.status === 'Active'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Doctors Management
        </h1>
        <Button onClick={() => setShowAddForm(true)}>
          Add Doctor
        </Button>
      </div>

      {/* Doctors Table */}
      <div className="neumorphic-inset rounded-lg p-4 border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-muted/90">
                <th className="text-left font-medium py-3 px-2">Name</th>
                <th className="text-left font-medium py-3 px-2">Department</th>
                <th className="text-left font-medium py-3 px-2">Email</th>
                <th className="text-left font-medium py-3 px-2">Phone</th>
                <th className="text-left font-medium py-3 px-2">Clinic</th>
                <th className="text-left font-medium py-3 px-2">Status</th>
                <th className="text-left font-medium py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-muted/90">
              {doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <IconUserCircle className="w-5 h-5" />
                      <span className="font-medium">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">{doctor.department}</td>
                  <td className="py-3 px-2">{doctor.email}</td>
                  <td className="py-3 px-2">{doctor.phone}</td>
                  <td className="py-3 px-2">{doctor.clinic_id}</td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      doctor.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {doctor.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(doctor)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Doctor Form Modal would go here */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Add New Doctor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="Dr. John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="Cardiology"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded-md"
                  placeholder="doctor@clinic.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full p-2 border rounded-md"
                  placeholder="+1-555-0123"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Doctor</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
