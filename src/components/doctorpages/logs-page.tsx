import { useState, useEffect, useMemo } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DoctorLogsAPI } from "@/api/doctor/logs"
import type { CallLog, TranscriptTurn } from "@/api/shared/types"

// Sentiment Analysis Component
const SentimentRating = ({ rating }: { rating: number }) => {
  // Scale 0-1 rating to 0-5 stars
  // If rating is > 1, assume it's already on 1-5 scale
  const scaledRating = rating <= 1 ? rating * 5 : rating
  const roundedRating = Math.round(scaledRating)

  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return "#14B5AA" // Bright teal for good/excellent (4-5 stars)
    if (rating >= 3) return "#005C55" // Dark teal for average (3 stars)
    if (rating >= 1) return "#FF8200" // Orange for poor (1-2 stars)
    return "#6B7280" // Muted gray for no rating
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          className={`w-4 h-4 ${star <= roundedRating
            ? "fill-current"
            : ""
            }`}
          style={{ color: getSentimentColor(roundedRating) }}
        />
      ))}
    </div>
  )
}

// Static logs config
const logsConfig = {
  pageTitle: "Call Logs",
  summaryCards: [
    { key: "total", title: "Total Calls", icon: "IconPhone" },
    { key: "scheduled", title: "Scheduled", icon: "IconCheck" },
    { key: "rescheduled", title: "Rescheduled", icon: "IconRefresh" },
    { key: "cancelled", title: "Cancelled", icon: "IconX" },
    { key: "failed", title: "Failed", icon: "IconExclamationCircle" }
  ],
  tableTitle: "All Call Logs",
  filters: [
    { label: "All Time", value: "all-time" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "this-week" },
    { label: "This Month", value: "this-month" }
  ],
  filterLabel: "Filter by:"
}

// Helper to filter logs by time range
const filterLogsByTime = (logs: CallLog[], timeFilter: string): CallLog[] => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (timeFilter) {
    case 'today': {
      return logs.filter(log => {
        const logDate = new Date(log.start_time)
        return logDate >= today
      })
    }
    case 'this-week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return logs.filter(log => {
        const logDate = new Date(log.start_time)
        return logDate >= weekStart
      })
    }
    case 'this-month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return logs.filter(log => {
        const logDate = new Date(log.start_time)
        return logDate >= monthStart
      })
    }
    case 'all-time':
    default:
      return logs
  }
}

export function LogsPage() {
  const [timeFilter, setTimeFilter] = useState("all-time")
  // Default to "total" so the first card is active and table shows all
  const [statusFilter, setStatusFilter] = useState<string>("total")
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  const [allLogs, setAllLogs] = useState<CallLog[]>([]) // All fetched logs
  const [loading, setLoading] = useState(true)
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const fetchedLogs = await DoctorLogsAPI.getLogs()
      // Sort logs by start_time descending (most recent first)
      const sortedLogs = fetchedLogs.sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )
      setAllLogs(sortedLogs)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  // Apply time filter to logs
  const timeFilteredLogs = useMemo(() =>
    filterLogsByTime(allLogs, timeFilter),
    [allLogs, timeFilter]
  )

  // Calculate summary stats from time-filtered logs
  const summaryStats = useMemo(() => ({
    total: timeFilteredLogs.length,
    scheduled: timeFilteredLogs.filter(l => l.status === 'scheduled').length,
    rescheduled: timeFilteredLogs.filter(l => l.status === 'rescheduled').length,
    cancelled: timeFilteredLogs.filter(l => l.status === 'cancelled').length,
    failed: timeFilteredLogs.filter(l => l.status === 'failed' || l.status === 'failure').length,
  }), [timeFilteredLogs])

  // Apply status filter to time-filtered logs
  const filteredLogs = useMemo(() => {
    if (!statusFilter || statusFilter === 'total') return timeFilteredLogs
    if (statusFilter === 'failed') {
      return timeFilteredLogs.filter(log => log.status === 'failed' || log.status === 'failure')
    }
    return timeFilteredLogs.filter(log => log.status === statusFilter)
  }, [timeFilteredLogs, statusFilter])

  const handleViewTranscript = async (log: CallLog) => {
    setSelectedLog(log)
    setShowTranscript(true)
    setLoadingTranscript(true)
    try {
      // Use id (number) converted to string for transcript fetch
      const fetchedTranscript = await DoctorLogsAPI.getTranscript(log.id.toString())
      setTranscript(fetchedTranscript)
    } catch (error) {
      console.error("Failed to fetch transcript:", error)
      setTranscript([])
    } finally {
      setLoadingTranscript(false)
    }
  }

  const tableHeaders = [
    { key: 'from', label: 'From' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'duration', label: 'Call Duration' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'action', label: 'Actions' }
  ]

  // Get filter title
  const getFilterTitle = () => {
    if (!statusFilter || statusFilter === 'total') return `All Call Logs (${timeFilteredLogs.length})`
    const card = logsConfig.summaryCards.find(c => c.key === statusFilter)
    return `${card?.title || 'Filtered'} Call Logs (${filteredLogs.length})`
  }

  // Helper to calculate duration
  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const durationMs = endTime - startTime
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  // Helper to format date
  const formatDate = (dateString: string) => {
    // Ensure UTC if no timezone specified (API returns UTC)
    const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
    const date = new Date(utcString)

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(date)
  }

  const handleDownloadTranscript = () => {
    if (!selectedLog || !transcript.length) return

    const blob = new Blob([JSON.stringify(transcript, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${selectedLog.call_id || selectedLog.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {logsConfig.summaryCards.map((card) => {
            const getCardColor = (key: string) => {
              switch (key) {
                case 'scheduled': return ''
                case 'rescheduled': return ''
                case 'cancelled':
                case 'failed': return ''
                default: return ''
              }
            }
            const getIconComponent = (iconName: string) => {
              switch (iconName) {
                case 'IconPhone': return <IconPhone className="size-4" />
                case 'IconCheck': return <IconCheck className="size-4" />
                case 'IconRefresh': return <IconRefresh className="size-4" />
                case 'IconX': return <IconX className="size-4" />
                case 'IconExclamationCircle': return <IconExclamationCircle className="size-4" />
                default: return <IconPhone className="size-4" />
              }
            }

            const isActive = statusFilter === card.key
            const handleCardClick = () => {
              // Clicking an active card resets back to "total" (all)
              setStatusFilter(isActive ? 'total' : card.key)
            }

            return (
              <div
                key={card.key}
                className={`neumorphic-inset p-4 neumorphic-hover transition-all duration-200 cursor-pointer ${isActive ? 'neumorphic-pressed ring-2 ring-primary' : ''
                  }`}
                onClick={handleCardClick}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {getIconComponent(card.icon)}
                    {card.title}
                  </div>
                  <div className={`text-2xl font-bold tabular-nums sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl ${getCardColor(card.key)}`}>
                    {summaryStats[card.key as keyof typeof summaryStats] || 0}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Call Logs Title */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{getFilterTitle()}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by:</span>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32 neumorphic-pressed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="neumorphic-pressed flex flex-col gap-2">
                {logsConfig.filters.map((filter) => (
                  <SelectItem
                    key={filter.value}
                    value={filter.value}
                    className="neumorphic-pressed my-1.5"
                  >
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="-mt-2 px-4 lg:px-6">
        <div className="neumorphic-inset rounded-lg p-4 border-0">

          {/* Table */}
          <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b-2 border-muted/90 bg-muted/10">
                  {tableHeaders.map((header) => (
                    <th key={header.key} className="text-left font-medium py-3 px-4">
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-muted/90">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">{log.from_phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{formatDate(log.start_time)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{calculateDuration(log.start_time, log.end_time)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <SentimentRating rating={log.sentiment_score || 0} />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          onClick={() => handleViewTranscript(log)}
                          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                        >
                          View Conversation
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

      {/* Conversation Transcript Overlay (custom div, not shadcn Dialog) */}
      {showTranscript && selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowTranscript(false)
            setSelectedLog(null)
            setTranscript([])
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-2xl mx-auto max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-semibold">
                    Conversational Transcript – <span className="font-mono">{selectedLog.from_phone}</span>
                  </h3>
                  <p className="text-xs">
                    Start Time: {formatDate(selectedLog.start_time)} • Duration: {calculateDuration(selectedLog.start_time, selectedLog.end_time)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadTranscript}
                    className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Download
                  </Button>
                  <Button
                    className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                    onClick={() => {
                      setShowTranscript(false)
                      setSelectedLog(null)
                      setTranscript([])
                    }}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto bg-card rounded-lg p-4 text-sm space-y-3">
                {loadingTranscript ? (
                  <p className="text-sm text-center py-4">Loading transcript...</p>
                ) : transcript.length === 0 ? (
                  <p className="text-sm">
                    No transcript available for this call yet.
                  </p>
                ) : (
                  transcript.map((turn, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center mt-0.5">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${turn.speaker === "A"
                            ? "bg-primary/10"
                            : "bg-muted"
                            }`}
                        >
                          {turn.speaker}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold mb-0.5">
                          {turn.label}
                        </div>
                        <div className="text-sm text-foreground whitespace-pre-line">
                          {turn.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
