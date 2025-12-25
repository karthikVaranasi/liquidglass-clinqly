import { useState, useEffect, useMemo, useRef } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar, IconFilter, IconPlayerPlay, IconPlayerPause, IconDownload, IconUserFilled, IconMessageOff } from "@tabler/icons-react"
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
import { Table, TableHeader, TableRow, TableHead } from "@/components/ui/table"

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
  tableTitle: "Total Call Logs",
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioPosition, setAudioPosition] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Gradient accents per summary card
  const logCardGradients: Record<string, string> = {
    total: "from-sky-500/20 via-sky-500/10 to-transparent",
    scheduled: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    rescheduled: "from-indigo-500/20 via-indigo-500/10 to-transparent",
    cancelled: "from-amber-500/25 via-amber-500/10 to-transparent",
    failed: "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
  }

  const logCardBorders: Record<string, string> = {
    total: "border-sky-500/50 dark:border-sky-400/50",
    scheduled: "border-emerald-500/50 dark:border-emerald-400/50",
    rescheduled: "border-indigo-500/50 dark:border-indigo-400/50",
    cancelled: "border-amber-500/50 dark:border-amber-400/50",
    failed: "border-fuchsia-500/50 dark:border-fuchsia-400/50",
  }

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

  // Helper to format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsAudioPlaying(!isAudioPlaying)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setAudioPosition(newTime)
    }
  }

  const handleViewTranscript = async (log: CallLog) => {
    setSelectedLog(log)
    setShowTranscript(true)
    setLoadingTranscript(true)
    try {
      // Use id (number) converted to string for transcript fetch
      const fetchedTranscript: any = await DoctorLogsAPI.getTranscript(log.id.toString())
      // API may return { transcript, audio }
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

  const tableHeaders = [
    { key: 'from', label: 'From' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'duration', label: 'Call Duration' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'action', label: 'Actions' }
  ]

  // Get filter title
  const getFilterTitle = () => {
    if (!statusFilter || statusFilter === 'total') return `Total Call Logs (${timeFilteredLogs.length})`
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

  // Helper to format date only (null-safe)
  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)
      if (isNaN(date.getTime())) return dateString
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date)
    } catch {
      return dateString
    }
  }

  // Helper to format time only (null-safe)
  const formatTimeOnly = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)
      if (isNaN(date.getTime())) return dateString
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date)
    } catch {
      return dateString
    }
  }

  // Helper to format date (full - null-safe)
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

  return (
    <div className="space-y-6 bg-transparent">
      {/* Summary Cards */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {logsConfig.summaryCards.map((card) => {
            const getIconComponent = (iconName: string) => {
              switch (iconName) {
                case 'IconPhone': return <IconPhone className="size-5" />
                case 'IconCheck': return <IconCheck className="size-5" />
                case 'IconRefresh': return <IconRefresh className="size-5" />
                case 'IconX': return <IconX className="size-5" />
                case 'IconExclamationCircle': return <IconExclamationCircle className="size-5" />
                default: return <IconPhone className="size-5" />
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
                className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group
                  bg-gradient-to-br ${logCardGradients[card.key] ?? "from-primary/20 via-primary/5 to-transparent"}
                  backdrop-blur-xl border-2 ${logCardBorders[card.key] || "border-white/50"}
                  shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
                  hover:scale-[1.02] glass-shine
                  cursor-pointer ${isActive ? 'ring-2 ring-primary shadow-[0_0_30px_rgba(255,255,255,0.6)]' : ''}`}
                onClick={handleCardClick}
              >
                {/* Dynamic Sliding Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                <div className="relative space-y-2 z-10">
                  <div className="flex items-center gap-2 text-sm font-semibold !text-foreground drop-shadow-sm">
                    {getIconComponent(card.icon)}
                    {card.title}
                  </div>
                  <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl !text-foreground drop-shadow-md">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h2 className="text-base md:text-xl font-bold tracking-tight">{getFilterTitle()}</h2>
          <div className="flex items-center gap-2">
            <IconFilter className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Filter:</span>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32 md:w-48 neumorphic-inset text-xs md:text-sm">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                {logsConfig.filters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
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
        <div className="relative bg-gradient-to-br from-[#9a8ea2]/80 to-[#b0a4b2]/60 dark:from-[#4a4257]/80 dark:to-[#5a5267]/60 backdrop-blur-xl rounded-xl p-4 border-[3px] border-[#e8a855]/70 dark:border-[#a87832]/60 shadow-[0_0_30px_rgba(232,168,85,0.5),0_0_60px_rgba(232,168,85,0.2),0_8px_32px_rgba(150,130,160,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_0_20px_rgba(168,120,50,0.4),0_8px_32px_rgba(50,40,60,0.3)] flex flex-col overflow-hidden glass-shine">
          {/* Glossy Top Highlight */}
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/25 via-white/10 to-transparent dark:from-white/15 dark:via-white/8 dark:to-transparent rounded-t-xl pointer-events-none" />

          <div className="overflow-hidden rounded-xl flex-1 flex flex-col relative z-10">

            {/* Fixed Header Table */}
            <table className="w-full text-sm table-fixed">
              <thead className="bg-[#9a8ea2] dark:bg-[#4a4257]">
                <tr>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[40%] md:w-[20%] text-sm md:text-base">From</th>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[30%] md:w-[15%] text-sm md:text-base">Date</th>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[10%] text-sm md:text-base hidden md:table-cell">Time</th>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[15%] text-sm md:text-base hidden md:table-cell">Duration</th>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[15%] text-sm md:text-base hidden md:table-cell">Sentiment</th>
                  <th className="text-left font-bold py-2 md:py-3 px-2 md:px-4 text-white w-[30%] md:w-[25%] text-sm md:text-base">Actions</th>
                </tr>
              </thead>
            </table>

            {/* Scrollable Body Container */}
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto flex-1 bg-white/80 dark:bg-white/20 rounded-lg">
              <table className="w-full text-sm table-fixed">
                <tbody className="divide-y divide-[#9a8ea2]/30">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-black dark:text-white">
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr key={index} className="bg-transparent hover:bg-white/10 transition-colors">
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[40%] md:w-[20%]">
                          <span className="text-sm md:text-base text-black dark:text-white">{log.from_phone}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[30%] md:w-[15%]">
                          <span className="text-sm md:text-base text-black dark:text-white">{formatDateOnly(log.start_time)}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[10%] hidden md:table-cell">
                          <span className="text-base text-black dark:text-white">{formatTimeOnly(log.start_time)}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[15%] hidden md:table-cell">
                          <span className="text-base text-black dark:text-white">{calculateDuration(log.start_time, log.end_time)}</span>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[15%] hidden md:table-cell">
                          <SentimentRating rating={log.sentiment_score || 0} />
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 w-[30%] md:w-[25%]">
                          <Button
                            onClick={() => handleViewTranscript(log)}
                            className="neumorphic-button-primary bg-[#e8a855] text-white hover:bg-[#d69645] border-none shadow-md text-xs md:text-sm px-2 md:px-3"
                          >
                            <span className="hidden md:inline">View Conversation</span>
                            <span className="md:hidden">View</span>
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
      </div>

      {/* Conversation Transcript Overlay (Liquid Glass) */}
      {showTranscript && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              setAudioPosition(0)
            }}
          />
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-gradient-to-br from-[#1a1c2e]/95 to-[#2a2c3e]/95 dark:from-[#0f111a]/95 dark:to-[#1a1d29]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <IconPhone className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Conversational Transcript
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedLog.from_phone} • {calculateDuration(selectedLog.start_time, selectedLog.end_time)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTranscript}
                  className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <IconDownload className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
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
                    setAudioPosition(0)
                  }}
                  className="text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
                >
                  <IconX className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Audio Player */}
            {audioUrl && (
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
                <div className="flex items-center gap-4 bg-white dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0"
                  >
                    {isAudioPlaying ? (
                      <IconPlayerPause className="w-5 h-5 fill-current" />
                    ) : (
                      <IconPlayerPlay className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between text-xs text-gray-400 px-0.5">
                      <span className="font-medium text-emerald-100">{formatTime(audioPosition)}</span>
                      <span>{formatTime(audioDuration || 0)}</span>
                    </div>

                    <div className="relative h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden group">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100"
                        style={{ width: `${(audioPosition / (audioDuration || 1)) * 100}%` }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        value={audioPosition}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={(e) => setAudioPosition(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                  onEnded={() => setIsAudioPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            {/* Transcript Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-black/20">
              {loadingTranscript ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-4">
                  <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="animate-pulse">Loading conversation...</p>
                </div>
              ) : transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                  <div className="p-4 rounded-full bg-gray-100 dark:bg-white/5">
                    <IconMessageOff className="w-8 h-8 opacity-50" />
                  </div>
                  <p>No transcript available for this call</p>
                </div>
              ) : (
                transcript.map((turn, index) => (
                  <div
                    key={index}
                    className={`flex ${turn.speaker === "A" ? "justify-start" : "justify-end"} group`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 mt-1 shadow-lg ${turn.speaker === "A"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-500/20"
                      : "order-2 ml-3 mr-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 ring-2 ring-white/50 dark:ring-white/10"
                      }`}>
                      {turn.speaker === "A" ? (
                        <div className="w-4 h-4 text-white">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                            <line x1="8" x2="16" y1="22" y2="22" />
                          </svg>
                        </div>
                      ) : (
                        <IconUserFilled className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                      )}
                    </div>

                    <div className={`flex-1 max-w-[85%] rounded-2xl p-4 shadow-sm ${turn.speaker === "A"
                      ? "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-tl-none shadow-sm"
                      : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-slate-800 dark:text-emerald-100 rounded-tr-none shadow-sm"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${turn.speaker === "A" ? "text-emerald-400" : "text-slate-400"
                          }`}>
                          {turn.label || (turn.speaker === "A" ? "Assistant" : "User")}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">
                        {turn.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500">
              Conversation ended by {selectedLog.status === 'completed' ? 'system' : 'user'}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

