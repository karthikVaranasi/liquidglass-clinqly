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
    <div className="space-y-6 bg-transparent">

      {/* Front Desk Requests Table */}
      <div className="px-4 lg:px-6">
        {/* Front Desk Requests Table */}
        {/* Front Desk Requests Table */}
        <div className="px-4 lg:px-6">
          <div className="relative bg-gradient-to-br from-[#9a8ea2]/80 to-[#b0a4b2]/60 dark:from-[#4a4257]/80 dark:to-[#5a5267]/60 backdrop-blur-xl rounded-xl p-4 border-[3px] border-[#e8a855]/70 dark:border-[#a87832]/60 shadow-[0_0_30px_rgba(232,168,85,0.5),0_0_60px_rgba(232,168,85,0.2),0_8px_32px_rgba(150,130,160,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_0_20px_rgba(168,120,50,0.4),0_8px_32px_rgba(50,40,60,0.3)] flex flex-col overflow-hidden glass-shine">
            {/* Glossy Top Highlight */}
            <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/25 via-white/10 to-transparent dark:from-white/15 dark:via-white/8 dark:to-transparent rounded-t-xl pointer-events-none" />

            <div className="overflow-hidden rounded-xl flex-1 flex flex-col relative z-10">

              {/* Fixed Header Table */}
              <table className="w-full text-sm md:text-base table-fixed">
                <thead className="bg-[#9a8ea2] dark:bg-[#4a4257]">
                  <tr>
                    <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white text-sm md:text-base w-[50%] md:w-[20%]">Name</th>
                    <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white text-sm md:text-base w-[25%] hidden md:table-cell">Phone</th>
                    <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white text-sm md:text-base w-[25%] hidden md:table-cell">Created At</th>
                    <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white text-sm md:text-base w-[50%] md:w-[30%]">
                      <div className="flex items-center justify-between">
                        <span>Tag</span>
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                          <SelectTrigger className="h-6 md:h-7 w-[90px] md:w-[130px] text-[10px] md:text-xs bg-white/20 border-white/30 text-white placeholder:text-white/70">
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
                      </div>
                    </th>
                  </tr>
                </thead>
              </table>

              {/* Scrollable Body Container */}
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto flex-1 bg-white/80 dark:bg-white/20 rounded-lg">
                {filteredRequests.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-black dark:text-white mb-2">
                        {selectedTag !== "all"
                          ? `No requests found with tag "${formatTagLabel(selectedTag)}"`
                          : "No front desk requests found"}
                      </div>
                      <div className="text-sm text-black dark:text-white">
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
                        className="border-b border-[#9a8ea2]/30 last:border-0"
                      >
                        <div className="w-full">
                          <AccordionTrigger className="hover:bg-white/10 hover:rounded-none px-0 py-0 hover:no-underline transition-colors [&>svg]:hidden">
                            <table className="w-full text-sm md:text-base table-fixed">
                              <tbody>
                                <tr className="bg-transparent">
                                  <td className="py-2 md:py-3 px-2 md:px-4 w-[50%] md:w-[20%]">
                                    <div className="flex items-center gap-1 md:gap-2 font-medium text-sm md:text-base">
                                      <IconUserCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-gray-700 dark:text-gray-200" />
                                      <span className="truncate text-black dark:text-white">{request.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 md:py-3 px-2 md:px-4 w-[25%] hidden md:table-cell text-base text-black dark:text-white">{request.phone_number}</td>
                                  <td className="py-2 md:py-3 px-2 md:px-4 w-[25%] hidden md:table-cell text-base text-black dark:text-white">{formatDate(request.created_at)}</td>
                                  <td className="py-2 md:py-3 px-2 md:px-4 w-[50%] md:w-[30%]">
                                    <div className="flex items-center justify-between w-full">
                                      {request.tag ? (
                                        <span
                                          className={`inline-flex items-center rounded-full px-1.5 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium ${tagStyles[request.tag] ?? "bg-muted text-foreground border border-muted"}`}
                                        >
                                          {formatTagLabel(request.tag)}
                                        </span>
                                      ) : (
                                        "_"
                                      )}
                                      {/* Arrow icon would be handled by AccordionTrigger automatically if not hidden, but we want custom layout */}
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-3 w-3 md:h-4 md:w-4 shrink-0 transition-transform duration-200 text-black dark:text-white opacity-50 ml-1 md:ml-2"
                                      >
                                        <path d="m6 9 6 6 6-6" />
                                      </svg>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 bg-black/5 dark:bg-black/10 pt-2 border-t border-black/5">
                            <div className="rounded-lg p-2">
                              <div className="text-xs font-medium text-black dark:text-white mb-2 uppercase tracking-wide opacity-70">
                                Message
                              </div>
                              <div
                                className="text-sm text-black dark:text-white font-normal"
                                style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}
                              >
                                {request.message || "No message provided."}
                              </div>
                            </div>
                          </AccordionContent>
                        </div>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}