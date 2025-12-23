import { useState, useEffect } from "react"
import { IconMapPin } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { AuthStorage } from "@/api/auth"
import { useAuth } from "@/hooks/use-auth"
import { DoctorRequestsAPI } from "@/api/doctor"
import { useCounts } from "@/contexts/counts-context"
import { getErrorMessage } from "@/lib/errors"

export function RefillRequestsPage() {
  const { clinicId } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setRefillRequestsCount } = useCounts()

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true)
        setError(null)

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
        setError(getErrorMessage(err))
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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading refill requests...</div>
        </div>
      </div>
    )
  }

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
    <div className="space-y-6 bg-transparent">

      {/* Refill Requests Table */}
      <div className="px-4 lg:px-6">
        <div className="bg-white/20 dark:bg-transparent backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {requests.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-foreground mb-2">No refill requests found</div>
                <div className="text-sm text-foreground">Prescription refill requests will appear here.</div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg">
              {/* Single table with sticky header */}
              <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[125px] text-xs sm:text-sm">Patient Name</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[115px] text-xs sm:text-sm">Patient Phone</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[120px] text-xs sm:text-sm hidden md:table-cell">Guardian Name</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[70px] text-xs sm:text-sm hidden lg:table-cell">Relationship</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[205px] text-xs sm:text-sm hidden md:table-cell">Details</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[150px] text-xs sm:text-sm hidden lg:table-cell">Pharmacy Name</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[175px] text-xs sm:text-sm hidden xl:table-cell">Pharmacy Location</th>
                      <th className="text-left font-bold text-foreground py-3 px-1.5 min-w-[100px] text-xs sm:text-sm">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {requests.map((request, index) => (
                      <tr key={request.id || index} className="hover:bg-white/10 transition-colors">
                        <td className="py-3 px-1.5 font-semibold text-xs sm:text-sm min-w-[125px]">
                          <div className="flex items-center gap-1">
                            {getPatientName(request)}
                          </div>
                        </td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm min-w-[115px]">{getPatientPhone(request)}</td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm min-w-[120px] hidden md:table-cell">{request.caller_name}</td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm min-w-[70px] hidden lg:table-cell">{getRelationship(request)}</td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm max-w-xs min-w-[205px] hidden md:table-cell">
                          <div className="line-clamp-2" title={getDetails(request)}>
                            {getDetails(request)}
                          </div>
                        </td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm min-w-[150px] hidden lg:table-cell">{request.pharmacy_name}</td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm max-w-xs min-w-[175px] hidden xl:table-cell">
                          <span
                            className="flex items-center gap-1 underline cursor-pointer line-clamp-2"
                            title={`Open ${request.pharmacy_location} in Google Maps`}
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.pharmacy_location)}`, '_blank')}
                          >
                            <IconMapPin className="w-4 h-4 flex-shrink-0" />
                            {request.pharmacy_location}
                          </span>
                        </td>
                        <td className="py-3 px-1.5 text-xs sm:text-sm min-w-[100px]">
                          {(() => {
                            const dateValue = getCreatedAt(request)
                            return formatDate(dateValue)
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}