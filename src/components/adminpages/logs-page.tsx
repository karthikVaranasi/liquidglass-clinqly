import { useState, useEffect, useMemo, useRef } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar, IconArrowLeft, IconPlayerPlay, IconPlayerPause, IconDownload } from "@tabler/icons-react"
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioPosition, setAudioPosition] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // ============================================
  // PERFORMANCE OPTIMIZATION: Pre-compute data structures
  // These memoized values prevent expensive O(n) filtering on every render
  // ============================================

  // Pre-compute logs grouped by phone number for O(1) lookups
  const logsGroupedByPhone = useMemo(() => {
    const grouped: Map<string | null, CallLog[]> = new Map()

    for (const log of allLogs) {
      const phone = log.to_phone
      if (!grouped.has(phone)) {
        grouped.set(phone, [])
      }
      grouped.get(phone)!.push(log)
    }

    return grouped
  }, [allLogs])

  // Pre-compute call counts per phone number for O(1) lookups
  const callCountsByPhone = useMemo(() => {
    const counts: Map<string | null, number> = new Map()

    for (const log of allLogs) {
      const phone = log.to_phone
      counts.set(phone, (counts.get(phone) || 0) + 1)
    }

    return counts
  }, [allLogs])

  // Pre-compute bot logs (logs with null to_phone)
  const botLogs = useMemo(() => {
    return logsGroupedByPhone.get(null) || []
  }, [logsGroupedByPhone])

  // Get total calls count (all logs) - O(1)
  const getTotalCallCount = () => {
    return allLogs.length
  }

  // Get Ezmedtech Bot calls count - O(1) now instead of O(n)
  const getBotCallCount = () => {
    return botLogs.length
  }

  // Handle view all logs
  const handleViewAllLogs = () => {
    setViewMode('all-logs')
  }

  // Handle view bot logs
  const handleViewBotLogs = () => {
    setViewMode('bot-logs')
  }

  // Get logs for selected clinic or special views - O(1) now instead of O(n)
  const getClinicLogs = useMemo(() => {
    if (viewMode === 'all-logs') {
      return allLogs
    }
    if (viewMode === 'bot-logs') {
      return botLogs
    }
    if (!selectedClinic) return []
    return logsGroupedByPhone.get(selectedClinic.phone_number) || []
  }, [viewMode, allLogs, botLogs, selectedClinic, logsGroupedByPhone])

  // Calculate total calls for each clinic - O(1) now instead of O(n)
  const getClinicCallCount = (clinic: Clinic) => {
    return callCountsByPhone.get(clinic.phone_number) || 0
  }

  // Handle transcript viewing
  const handleViewTranscript = async (log: CallLog) => {
    setSelectedLog(log)
    setShowTranscript(true)
    setLoadingTranscript(true)
    try {
      const fetchedTranscript: any = await AdminLogsAPI.getTranscript(log.id.toString())
      if (Array.isArray(fetchedTranscript)) {
        setTranscript(fetchedTranscript)
        setAudioUrl(null)
      } else {
        setTranscript(fetchedTranscript?.transcript || [])
        setAudioUrl(fetchedTranscript?.audio ? `data:audio/mpeg;base64,${fetchedTranscript.audio}` : null)
      }
      setIsAudioPlaying(false)
      setAudioDuration(0)
      setAudioPosition(0)
    } catch (error) {
      console.error("Failed to fetch transcript:", error)
      setTranscript([])
      setAudioUrl(null)
      setAudioDuration(0)
      setAudioPosition(0)
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

  // Helper to format date (null-safe)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      // Ensure UTC if no timezone specified (API returns UTC)
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)

      if (isNaN(date.getTime())) return dateString

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
    } catch {
      return dateString
    }
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

  const handleToggleAudio = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play()
      setIsAudioPlaying(true)
    } else {
      audioRef.current.pause()
      setIsAudioPlaying(false)
    }
  }

  const handleDownloadAudio = () => {
    if (!selectedLog || !audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `audio-${selectedLog.call_id || selectedLog.id}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Apply time filter to clinic logs - memoized for performance
  const timeFilteredLogs = useMemo(() => {
    return filterLogsByTime(getClinicLogs, timeFilter)
  }, [getClinicLogs, timeFilter])

  // Gradient accents per summary card
  const logCardGradients: Record<string, string> = {
    total: "from-sky-500/20 via-sky-500/10 to-transparent",
    scheduled: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    rescheduled: "from-indigo-500/20 via-indigo-500/10 to-transparent",
    cancelled: "from-amber-500/25 via-amber-500/10 to-transparent",
    failed: "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
  }

  // Calculate summary stats from time-filtered logs - memoized for performance
  const summaryStats = useMemo(() => ({
    total: timeFilteredLogs.length,
    scheduled: timeFilteredLogs.filter(l => l.status === 'scheduled').length,
    rescheduled: timeFilteredLogs.filter(l => l.status === 'rescheduled').length,
    cancelled: timeFilteredLogs.filter(l => l.status === 'cancelled').length,
    failed: timeFilteredLogs.filter(l => l.status === 'failed' || l.status === 'failure').length,
  }), [timeFilteredLogs])

  // Apply status filter to time-filtered logs and sort by date (newest first) - memoized for performance
  const filteredLogs = useMemo(() => {
    let logs = timeFilteredLogs

    // Apply status filter
    if (statusFilter && statusFilter !== 'total') {
      if (statusFilter === 'failed') {
        logs = logs.filter(log => log.status === 'failed' || log.status === 'failure')
      } else {
        logs = logs.filter(log => log.status === statusFilter)
      }
    }

    // Sort by start_time descending (newest first)
    return [...logs].sort((a, b) => {
      const dateA = new Date(a.start_time).getTime()
      const dateB = new Date(b.start_time).getTime()
      return dateB - dateA // Descending order
    })
  }, [timeFilteredLogs, statusFilter])

  // Get filter title for clinic logs view
  const getFilterTitle = () => {
    if (!statusFilter || statusFilter === 'total') return `Total Call Logs (${timeFilteredLogs.length})`
    const card = logsConfig.summaryCards.find(c => c.key === statusFilter)
    return `${card?.title || 'Filtered'} Call Logs (${filteredLogs.length})`
  }

  // Filter clinics based on search query - memoized for performance
  const filteredClinics = useMemo(() => {
    return clinics.filter(clinic =>
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.phone_number.includes(searchQuery)
    )
  }, [clinics, searchQuery])


  // Render clinics overview
  if (viewMode === 'clinics') {
    // Show full-page loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg">Loading call logs...</div>
          </div>
        </div>
      )
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">{error}</div>
            <Button
              onClick={fetchData}
              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200"
            >
              Try Again
            </Button>
          </div>
        </div>
      )
    }

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
                  {filteredClinics.length === 0 ? (
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
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-foreground">
                            <IconPhone className="w-4 h-4" />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-sm font-medium">All Calls</span>
                            <div className="text-xs text-foreground">View all call logs across all clinics</div>
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
                            className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                            <div className="text-xs text-foreground">Chatbot interactions from ezmedtech.ai</div>
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
                            className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                              className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
          className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-foreground">
                  <IconPhone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Calls</h2>
                  <p className="text-sm text-foreground">View all call logs across all clinics</p>
                </div>
              </>
            ) : viewMode === 'bot-logs' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-lg font-bold text-secondary">
                  🤖
                </div>
                <div>
                  <h2 className="text-xl font-bold">Ezmedtech Bot</h2>
                  <p className="text-sm text-foreground">Chatbot interactions from ezmedtech.ai</p>
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
                  <p className="text-sm text-foreground">{selectedClinic?.phone_number}</p>
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
                className={`relative overflow-hidden neumorphic-inset p-4 neumorphic-hover transition-all duration-200 cursor-pointer ${isActive ? 'neumorphic-pressed ring-2 ring-primary' : ''
                  }`}
                onClick={handleCardClick}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${logCardGradients[card.key] ?? "from-primary/20 via-primary/5 to-transparent"}`}
                  aria-hidden
                />
                <div className="relative space-y-2 z-10">
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
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-foreground">
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
                          className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
            if (audioRef.current) {
              audioRef.current.pause()
              audioRef.current.currentTime = 0
            }
            setAudioUrl(null)
            setIsAudioPlaying(false)
            setAudioDuration(0)
            setAudioPosition(0)
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
                    className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Download
                  </Button>
                  <Button
                    className="w-fit text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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

              {audioUrl && (
                <div className="space-y-2 bg-muted/40 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleToggleAudio}
                        className="w-fit text-xs sm:text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                      >
                        {isAudioPlaying ? (
                          <IconPlayerPause className="size-5" />
                        ) : (
                          <IconPlayerPlay className="size-5" />
                        )}
                      </Button>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsAudioPlaying(false)}
                        onLoadedMetadata={() => {
                          if (audioRef.current?.duration) {
                            setAudioDuration(audioRef.current.duration)
                          }
                        }}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            setAudioPosition(audioRef.current.currentTime)
                            setAudioDuration(audioRef.current.duration || audioDuration)
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleDownloadAudio}
                        className="w-fit text-xs sm:text-sm font-medium neumorphic-pressed text-foreground hover:text-foreground-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                      >
                        <IconDownload className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 1}
                      step={0.1}
                      value={Math.min(audioPosition, audioDuration || 1)}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setAudioPosition(val)
                        if (audioRef.current) {
                          audioRef.current.currentTime = val
                        }
                      }}
                      className="w-full audio-slider"
                    />
                    <span className="text-[11px] text-foreground w-16 text-right">
                      {Math.floor(audioPosition)}s / {Math.max(1, Math.floor(audioDuration))}s
                    </span>
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto bg-card rounded-lg p-4 text-sm space-y-3">
                {loadingTranscript ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm">Loading transcript...</p>
                    </div>
                  </div>
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
