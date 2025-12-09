import { useState, useEffect } from "react"
import { IconUserCircle } from "@tabler/icons-react"
import { AuthStorage } from "@/api/auth"
import { DoctorRequestsAPI } from "@/api/doctor"
import { useCounts } from "@/contexts/counts-context"
import { getErrorMessage } from "@/lib/errors"

export function FrontDeskPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setFrontDeskCount } = useCounts()

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

        const result = await DoctorRequestsAPI.getFrontDeskRequests(clinicId)
        setRequests(result.data)
        setFrontDeskCount(result.count)
      } catch (err) {
        console.error('Failed to fetch front desk requests:', err)
        setError(getErrorMessage(err))
        setRequests([])
        setFrontDeskCount(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString
      }
      // Format date and time: MM/DD/YYYY, HH:MM AM/PM
      const datePart = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
      const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      return `${datePart}, ${timePart}`
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="px-4 lg:px-6">
          <div className="neumorphic-inset rounded-lg p-4 border-0">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-sm text-muted-foreground">Loading front desk requests...</div>
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

      {/* Front Desk Requests Table */}
      <div className="px-4 lg:px-6">
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          <div className="overflow-x-auto max-h-[84vh] overflow-y-auto bg-card rounded-lg">
            {requests.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-muted-foreground mb-2">No front desk requests found</div>
                  <div className="text-sm text-muted-foreground">Requests will appear here when patients contact the front desk.</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b-2 border-muted/90 bg-muted/10">
                    <th className="text-left font-medium py-3 px-2 min-w-[120px]">Name</th>
                    <th className="text-left font-medium py-3 px-2 min-w-[140px]">Phone Number</th>
                    <th className="text-left font-medium py-3 px-2 min-w-[300px]">Message</th>
                    <th className="text-left font-medium py-3 px-2 min-w-[160px]">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-muted/90">
                  {requests.map((request, index) => (
                    <tr key={request.id || index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-medium text-sm">
                        <div className="flex items-center gap-1">
                          <IconUserCircle className="w-5 h-5" />
                          {request.name}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm">{request.phone_number}</td>
                      <td className="py-3 px-2 text-sm align-top max-w-xl">
                        <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                          {request.message}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm">{formatDate(request.created_at)}</td>
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