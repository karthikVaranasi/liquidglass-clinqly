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
        <div className="relative bg-gradient-to-br from-[#9a8ea2]/80 to-[#b0a4b2]/60 dark:from-[#4a4257]/80 dark:to-[#5a5267]/60 backdrop-blur-xl rounded-xl p-4 border-[3px] border-[#e8a855]/70 dark:border-[#a87832]/60 shadow-[0_0_30px_rgba(232,168,85,0.5),0_0_60px_rgba(232,168,85,0.2),0_8px_32px_rgba(150,130,160,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_0_20px_rgba(168,120,50,0.4),0_8px_32px_rgba(50,40,60,0.3)] flex flex-col overflow-hidden glass-shine">
          {/* Glossy Top Highlight */}
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/25 via-white/10 to-transparent dark:from-white/15 dark:via-white/8 dark:to-transparent rounded-t-xl pointer-events-none" />

          <div className="overflow-hidden rounded-xl flex-1 flex flex-col relative z-10">
            {requests.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-black dark:text-white mb-2">No refill requests found</div>
                  <div className="text-sm text-black dark:text-white">Prescription refill requests will appear here.</div>
                </div>
              </div>
            ) : (
              <>
                {/* Fixed Header Table */}
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-[#9a8ea2] dark:bg-[#4a4257]">
                    <tr>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[16%]">Patient Name</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[12%]">Patient Phone</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[12%] hidden md:table-cell">Guardian</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[10%] hidden lg:table-cell">Rel.</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[20%] hidden md:table-cell">Details</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[15%] hidden lg:table-cell">Pharmacy Name</th>
                      <th className="text-left font-bold text-white py-3 px-3 sm:px-4 w-[15%] hidden xl:table-cell">Pharmacy Loc.</th>
                    </tr>
                  </thead>
                </table>

                {/* Scrollable Body Container */}
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto flex-1 bg-white/80 dark:bg-white/20 rounded-lg">
                  <table className="w-full text-sm table-fixed">
                    <tbody className="divide-y divide-[#9a8ea2]/30">
                      {requests.map((request, index) => (
                        <tr key={request.id || index} className="bg-transparent hover:bg-white/10 transition-colors group">
                          <td className="py-3 px-3 sm:px-4 font-normal text-xs sm:text-sm text-black dark:text-white w-[16%]">
                            <div className="flex items-center gap-2">
                              {getPatientName(request)}
                            </div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm text-black dark:text-white w-[12%]">{getPatientPhone(request)}</td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm hidden md:table-cell text-black dark:text-white w-[12%]">{request.caller_name || "—"}</td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm hidden lg:table-cell text-black dark:text-white w-[10%]">{getRelationship(request) || "—"}</td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm hidden md:table-cell text-black dark:text-white w-[20%]">
                            <div className="line-clamp-2" title={getDetails(request)}>
                              {getDetails(request) || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm hidden lg:table-cell text-black dark:text-white w-[15%]">{request.pharmacy_name || "—"}</td>
                          <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm hidden xl:table-cell text-black dark:text-white w-[15%]">
                            {request.pharmacy_location ? (
                              <span
                                className="flex items-center gap-1 underline cursor-pointer line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title={`Open ${request.pharmacy_location} in Google Maps`}
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.pharmacy_location)}`, '_blank')}
                              >
                                <IconMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {request.pharmacy_location}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}