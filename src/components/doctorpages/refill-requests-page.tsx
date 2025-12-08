import { useState, useEffect } from "react"
import { IconUserCircle } from "@tabler/icons-react"
import { AuthStorage } from "@/api/auth"
import { DoctorRequestsAPI } from "@/api/doctor"
import { useCounts } from "@/contexts/counts-context"

export function RefillRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setRefillRequestsCount } = useCounts()

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = AuthStorage.getUserData()
        const clinicId = userData?.clinic_id

        if (!clinicId) {
          setError('Clinic ID not found. Please log in again.')
          setLoading(false)
          return
        }

        const result = await DoctorRequestsAPI.getRefillRequests(clinicId)
        setRequests(result.data)
        setRefillRequestsCount(result.count)
      } catch (err) {
        console.error('Failed to fetch refill requests:', err)
        setError(err instanceof Error ? err.message : 'Failed to load refill requests')
        setRequests([])
        setRefillRequestsCount(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString // Return original string if invalid
      }
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    } catch {
      return dateString || 'N/A'
    }
  }

  const getPatientId = (request: any) => {
    return request.patient_id || request.patient?.id || 'N/A'
  }

  const getPatientName = (request: any) => {
    if (request.patient_name) return request.patient_name
    if (request.patient?.first_name && request.patient?.last_name) {
      return `${request.patient.first_name} ${request.patient.last_name}`
    }
    return 'Unknown'
  }

  const getPatientPhone = (request: any) => {
    return request.patient_phone || request.patient?.phone_number || request.phone_number || ''
  }

  const getRelationship = (request: any) => {
    return request.relationship || request.relationship_to_patient || ''
  }

  const getDetails = (request: any) => {
    return request.details || request.request || ''
  }

  const getCreatedAt = (request: any) => {
    // Check multiple possible date field names (top level)
    let dateValue = request.created_at 
      || request.createdAt 
      || request.date 
      || request.timestamp
      || request.created_date
      || request.created_date_time
      || request.created
      || request.date_created
      || request.time_created
      || request.inserted_at
      || request.updated_at
      || null
    
    // If not found at top level, check nested objects
    if (!dateValue) {
      // Check in patient object
      if (request.patient) {
        dateValue = request.patient.created_at 
          || request.patient.createdAt
          || request.patient.date_created
          || null
      }
      
      // Check if there's a metadata or extra field
      if (!dateValue && request.metadata) {
        dateValue = request.metadata.created_at || request.metadata.date_created || null
      }
    }
    
    return dateValue
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="px-4 lg:px-6">
          <div className="neumorphic-inset rounded-lg p-4 border-0">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-sm text-muted-foreground">Loading refill requests...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="px-4 lg:px-6">
          <div className="neumorphic-inset rounded-lg p-4 border-0">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-500 mb-2">⚠️ Error</div>
                <div className="text-sm text-muted-foreground">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Refill Requests Table */}
      <div className="px-4 lg:px-6">
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          <div className="overflow-x-auto max-h-[84vh] overflow-y-auto bg-card rounded-lg">
            {requests.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-muted-foreground mb-2">No refill requests found</div>
                  <div className="text-sm text-muted-foreground">Prescription refill requests will appear here.</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b-2 border-muted/90 bg-muted/10">
                    <th className="text-left font-medium py-3 px-1.5 min-w-[90px]">Patient ID</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[150px]">Patient Name</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[115px]">Patient Phone</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[120px]">Caller Name</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[70px]">Relationship</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[205px]">Details</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[150px]">Pharmacy Name</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[175px]">Pharmacy Location</th>
                    <th className="text-left font-medium py-3 px-1.5 min-w-[100px]">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-muted/90">
                  {requests.map((request, index) => (
                    <tr key={request.id || index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-1.5 text-sm font-medium">{getPatientId(request)}</td>
                      <td className="py-3 px-1.5 font-medium text-sm">
                        <div className="flex items-center gap-1">
                          <IconUserCircle className="w-5 h-5" />
                          {getPatientName(request)}
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-sm">{getPatientPhone(request)}</td>
                      <td className="py-3 px-1.5 text-sm">{request.caller_name}</td>
                      <td className="py-3 px-1.5 text-sm">{getRelationship(request)}</td>
                      <td className="py-3 px-1.5 text-sm max-w-xs">
                        <div className="line-clamp-2" title={getDetails(request)}>
                          {getDetails(request)}
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-sm">{request.pharmacy_name}</td>
                      <td className="py-3 px-1.5 text-sm max-w-xs">
                        <div className="line-clamp-2" title={request.pharmacy_location}>
                          {request.pharmacy_location}
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-sm">
                        {(() => {
                          const dateValue = getCreatedAt(request)
                          // Debug: Show raw value temporarily to help identify the field
                          if (!dateValue) {
                            console.log(`Request ID ${request.id}: No date found. All fields:`, Object.keys(request))
                          }
                          return formatDate(dateValue)
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}