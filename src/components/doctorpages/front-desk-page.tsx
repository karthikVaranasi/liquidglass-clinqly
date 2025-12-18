import { useState, useEffect, useMemo } from "react"
import { IconUserCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { DoctorRequestsAPI } from "@/api/doctor"
import { useCounts } from "@/contexts/counts-context"
import { getErrorMessage } from "@/lib/errors"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function FrontDeskPage() {
  const { clinicId } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const { setFrontDeskCount } = useCounts()

  // Tag -> color mapping (avoid reds) with distinct colors for each tag
  const tagStyles: Record<string, string> = {
    appointment: "bg-sky-100 text-sky-800 border border-sky-300",
    billing: "bg-amber-100 text-amber-800 border border-amber-300",
    callback: "bg-violet-100 text-violet-800 border border-violet-300",
    insurance: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    prescription: "bg-teal-100 text-teal-800 border border-teal-300",
    lab_results: "bg-indigo-100 text-indigo-800 border border-indigo-300",
    medical_records: "bg-cyan-100 text-cyan-800 border border-cyan-300",
    scheduling_issue: "bg-orange-100 text-orange-800 border border-orange-300",
    doctor_availability: "bg-blue-100 text-blue-800 border border-blue-300",
    tech_support: "bg-slate-100 text-slate-800 border border-slate-300",
    others: "bg-zinc-100 text-zinc-800 border border-zinc-300",
  }

  // Available tag options for filter
  const tagOptions = [
    { value: "all", label: "All Tags" },
    { value: "appointment", label: "Appointment" },
    { value: "billing", label: "Billing" },
    { value: "callback", label: "Callback" },
    { value: "insurance", label: "Insurance" },
    { value: "prescription", label: "Prescription" },
    { value: "lab_results", label: "Lab Results" },
    { value: "medical_records", label: "Medical Records" },
    { value: "scheduling_issue", label: "Scheduling Issue" },
    { value: "doctor_availability", label: "Doctor Availability" },
    { value: "tech_support", label: "Tech Support" },
    { value: "others", label: "Others" },
  ]

  // Filter requests based on selected tag
  const filteredRequests = useMemo(() => {
    if (selectedTag === "all") return requests
    return requests.filter((req) => req.tag === selectedTag)
  }, [requests, selectedTag])

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

    if (clinicId) {
      fetchRequests()
    }
  }, [clinicId])

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

  const formatTagLabel = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading front desk requests...</div>
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
    <div className="space-y-6">

      {/* Front Desk Requests Table */}
      <div className="px-4 lg:px-6">
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          <div className="overflow-x-auto max-h-[82vh] overflow-y-auto bg-card rounded-lg">
            {/* Table Header - Always Visible */}
            <div className="sticky top-0 z-10 bg-card border-b-2 border-muted/90">
              <div className="grid grid-cols-4 gap-4 py-3 px-4 bg-muted/10 items-center">
                <div className="font-medium text-sm">Name</div>
                <div className="font-medium text-sm">Phone Number</div>
                <div className="font-medium text-sm">Created At</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Tag</span>
                  <div className="flex items-center gap-2">
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        {tagOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTag !== "all" && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ({filteredRequests.length}/{requests.length})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body or Empty State */}
            {filteredRequests.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-foreground mb-2">
                    {selectedTag !== "all"
                      ? `No requests found with tag "${formatTagLabel(selectedTag)}"`
                      : "No front desk requests found"}
                  </div>
                  <div className="text-sm text-foreground">
                    {selectedTag !== "all"
                      ? "Try selecting a different tag or view all requests."
                      : "Requests will appear here when patients contact the front desk."}
                  </div>
                </div>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredRequests.map((request, index) => (
                  <AccordionItem
                    key={request.id || index}
                    value={`item-${request.id || index}`}
                    className="border-b border-muted/50"
                  >
                    <AccordionTrigger className="hover:bg-muted/30 hover:rounded-none px-4 py-0 hover:no-underline [&>svg]:my-auto">
                      <div className="grid grid-cols-4 gap-4 w-full py-3 text-left items-center">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <IconUserCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="truncate">{request.name}</span>
                        </div>
                        <div className="text-sm">{request.phone_number}</div>
                        <div className="text-sm">{formatDate(request.created_at)}</div>
                        <div className="text-sm">
                          {request.tag ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tagStyles[request.tag] ?? "bg-muted text-foreground border border-muted"}`}
                            >
                              {formatTagLabel(request.tag)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="rounded-lg p-4">
                        <div className="text-xs font-medium text-foreground mb-2 uppercase tracking-wide">
                          Message
                        </div>
                        <div
                          className="text-sm text-foreground"
                          style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}
                        >
                          {request.message || "No message provided."}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}