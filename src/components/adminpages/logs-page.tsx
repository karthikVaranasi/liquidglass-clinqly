import { useState, useEffect } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar, IconArrowLeft } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AdminLogsAPI, AdminClinicsAPI } from "@/api/admin"
import type { Clinic } from "@/api/admin/clinics"
import type { CallLog, TranscriptTurn } from "@/api/shared/types"
import { getErrorMessage } from "@/lib/errors"

// Sentiment Analysis Component
const SentimentRating = ({ rating }: { rating: number }) => {
  const roundedRating = Math.round(rating) // Round to 1, 2, 3, 4, or 5

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

// Logs config
const logsConfig = {
  pageTitle: "Call Logs",
  summaryCards: [
    { key: "total", title: "Total Calls", icon: "IconPhone" },
    { key: "scheduled", title: "Scheduled", icon: "IconCheck" },
    { key: "rescheduled", title: "Rescheduled", icon: "IconRefresh" },
    { key: "cancelled", title: "Cancelled", icon: "IconX" },
    { key: "failed", title: "Failed", icon: "IconExclamationCircle" }
  ],
  filters: [
    { label: "All Time", value: "all-time" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "this-week" },
    { label: "This Month", value: "this-month" }
  ]
}

export function LogsPage() {
  // View mode: 'clinics' for overview table, 'clinic-logs' for individual clinic logs, 'all-logs' for all calls, 'bot-logs' for ezmedtech bot
  const [viewMode, setViewMode] = useState<'clinics' | 'clinic-logs' | 'all-logs' | 'bot-logs'>('clinics')
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)

  // Clinics and logs data
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [allLogs, setAllLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('')

  // Individual clinic logs view state
  const [timeFilter, setTimeFilter] = useState("all-time")
  const [statusFilter, setStatusFilter] = useState<string>("total")
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [clinicsData, logsData] = await Promise.all([
        AdminClinicsAPI.getAllClinics(),
        AdminLogsAPI.getLogs()
      ])
      setClinics(clinicsData)
      setAllLogs(logsData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Handle view logs for a specific clinic
  const handleViewClinicLogs = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setViewMode('clinic-logs')
  }

  // Handle back to clinics overview
  const handleBackToClinics = () => {
    setViewMode('clinics')
    setSelectedClinic(null)
    setSelectedLog(null)
    setShowTranscript(false)
    setTranscript([])
  }

  // Get total calls count (all logs)
  const getTotalCallCount = () => {
    return allLogs.length
  }

  // Get Ezmedtech Bot calls count (logs with null to_phone)
  const getBotCallCount = () => {
    return allLogs.filter(log => log.to_phone === null).length
  }

  // Handle view all logs
  const handleViewAllLogs = () => {
    setViewMode('all-logs')
  }

  // Handle view bot logs
  const handleViewBotLogs = () => {
    setViewMode('bot-logs')
  }

  // Get logs for selected clinic or special views
  const getClinicLogs = () => {
    if (viewMode === 'all-logs') {
      return allLogs
    }
    if (viewMode === 'bot-logs') {
      return allLogs.filter(log => log.to_phone === null)
    }
    if (!selectedClinic) return []
    return allLogs.filter(log => log.to_phone === selectedClinic.phone_number)
  }

  // Calculate total calls for each clinic
  const getClinicCallCount = (clinic: Clinic) => {
    return allLogs.filter(log => log.to_phone === clinic.phone_number).length
  }

  // Handle transcript viewing
  const handleViewTranscript = async (log: CallLog) => {
    setSelectedLog(log)
    setShowTranscript(true)
    setLoadingTranscript(true)
    try {
      const fetchedTranscript = await AdminLogsAPI.getTranscript(log.id.toString())
      setTranscript(fetchedTranscript)
    } catch (error) {
      console.error("Failed to fetch transcript:", error)
      setTranscript([])
    } finally {
      setLoadingTranscript(false)
    }
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

  // Handle download transcript
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

  // Apply time filter to clinic logs
  const timeFilteredLogs = filterLogsByTime(getClinicLogs(), timeFilter)

  // Calculate summary stats from time-filtered logs
  const summaryStats = (() => ({
    total: timeFilteredLogs.length,
    scheduled: timeFilteredLogs.filter(l => l.status === 'scheduled').length,
    rescheduled: timeFilteredLogs.filter(l => l.status === 'rescheduled').length,
    cancelled: timeFilteredLogs.filter(l => l.status === 'cancelled').length,
    failed: timeFilteredLogs.filter(l => l.status === 'failed' || l.status === 'failure').length,
  }))()

  // Apply status filter to time-filtered logs
  const filteredLogs = (() => {
    if (!statusFilter || statusFilter === 'total') return timeFilteredLogs
    if (statusFilter === 'failed') {
      return timeFilteredLogs.filter(log => log.status === 'failed' || log.status === 'failure')
    }
    return timeFilteredLogs.filter(log => log.status === statusFilter)
  })()

  // Get filter title for clinic logs view
  const getFilterTitle = () => {
    if (!statusFilter || statusFilter === 'total') return `Total Call Logs (${timeFilteredLogs.length})`
    const card = logsConfig.summaryCards.find(c => c.key === statusFilter)
    return `${card?.title || 'Filtered'} Call Logs (${filteredLogs.length})`
  }

  // Filter clinics based on search query
  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.phone_number.includes(searchQuery)
  )


  // Render clinics overview
  if (viewMode === 'clinics') {
    return (
      <div className="space-y-3">

        {/* Search Input */}
        <div className="px-4 lg:px-6">
          <input
            type="text"
            placeholder="Search clinics by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Clinics Table */}
        <div className="px-4 lg:px-6">
          <div className="neumorphic-inset rounded-lg p-4 border-0">
            {error && (
              <div className="text-center py-8 text-destructive">
                <p className="text-sm mb-2">{error}</p>
                <Button
                  onClick={fetchData}
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
                >
                  Try Again
                </Button>
              </div>
            )}

            {!error && (
              <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b-2 border-muted/90 bg-muted/10">
                      <th className="text-left font-medium py-3 px-4">Logo</th>
                      <th className="text-left font-medium py-3 px-4">Clinic Name</th>
                      <th className="text-left font-medium py-3 px-4">Address</th>
                      <th className="text-left font-medium py-3 px-4">Phone Number</th>
                      <th className="text-left font-medium py-3 px-4">Total Calls</th>
                      <th className="text-left font-medium py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-muted/90">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="text-sm">Loading clinics...</div>
                        </td>
                      </tr>
                    ) : filteredClinics.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="text-sm">No clinics found</div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* All Calls Row */}
                        <tr className="hover:bg-muted/30 transition-colors bg-muted/5">
                          <td className="py-3 px-4">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              <IconPhone className="w-4 h-4" />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="text-sm font-medium">All Calls</span>
                              <div className="text-xs text-muted-foreground">View all call logs across all clinics</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">-</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">-</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium">{getTotalCallCount()}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={handleViewAllLogs}
                              className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                            >
                              View Logs
                            </Button>
                          </td>
                        </tr>

                        {/* Ezmedtech Bot Row */}
                        <tr className="hover:bg-muted/30 transition-colors bg-muted/5">
                          <td className="py-3 px-4">
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary">
                              🤖
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="text-sm font-medium">Ezmedtech Bot</span>
                              <div className="text-xs text-muted-foreground">Chatbot interactions from ezmedtech.ai</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">-</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">-</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium">{getBotCallCount()}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={handleViewBotLogs}
                              className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                            >
                              View Logs
                            </Button>
                          </td>
                        </tr>

                        {/* Clinics Rows */}
                        {filteredClinics.map((clinic) => (
                          <tr key={clinic.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              {clinic.logo_url ? (
                                <img
                                  src={clinic.logo_url}
                                  alt={clinic.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                  {clinic.name[0].toUpperCase()}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium">{clinic.name}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm">{clinic.address}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm">{clinic.phone_number}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium">{getClinicCallCount(clinic)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                onClick={() => handleViewClinicLogs(clinic)}
                                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                              >
                                View Logs
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render individual clinic logs view (same as doctor logs page)
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="px-4 lg:px-6">
        <Button
          onClick={handleBackToClinics}
          size="sm"
          className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Clinics</span>
        </Button>
      </div>

      {/* Header for different view modes */}
      <div className="px-4 lg:px-6">
        <div className="neumorphic-inset rounded-lg p-4">
          <div className="flex items-center gap-4">
            {viewMode === 'all-logs' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  <IconPhone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Calls</h2>
                  <p className="text-sm text-muted-foreground">View all call logs across all clinics</p>
                </div>
              </>
            ) : viewMode === 'bot-logs' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-lg font-bold text-secondary">
                  🤖
                </div>
                <div>
                  <h2 className="text-xl font-bold">Ezmedtech Bot</h2>
                  <p className="text-sm text-muted-foreground">Chatbot interactions from ezmedtech.ai</p>
                </div>
              </>
            ) : (
              <>
                {selectedClinic?.logo_url ? (
                  <img
                    src={selectedClinic.logo_url}
                    alt={selectedClinic.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                    {selectedClinic?.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{selectedClinic?.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedClinic?.phone_number}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
              <SelectTrigger className="w-32 neumorphic-inset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {logsConfig.filters.map((filter) => (
                  <SelectItem
                    key={filter.value}
                    value={filter.value}
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
          <div className="overflow-x-auto max-h-[78vh] overflow-y-auto bg-card rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b-2 border-muted/90 bg-muted/10">
                  <th className="text-left font-medium py-3 px-4">From</th>
                  <th className="text-left font-medium py-3 px-4">Start Time</th>
                  <th className="text-left font-medium py-3 px-4">Call Duration</th>
                  <th className="text-left font-medium py-3 px-4">Sentiment</th>
                  <th className="text-left font-medium py-3 px-4">Actions</th>
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

      {/* Conversation Transcript Overlay */}
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
