import { useState, useEffect, useMemo, useRef } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar, IconFilter, IconPlayerPlay, IconPlayerPause, IconDownload, IconUserFilled } from "@tabler/icons-react"
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
            <IconFilter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter by:</span>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-48 neumorphic-inset">
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
        <div className="bg-white/20 dark:bg-transparent backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <div className="overflow-hidden rounded-lg">
            {/* Single table with fixed columns for alignment */}
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 z-10 bg-white/20 dark:bg-black/40 backdrop-blur-md">
                  <tr className="border-b border-white/20">
                    <th className="text-left font-bold py-3 px-4 text-foreground w-1/5">From</th>
                    <th className="text-left font-bold py-3 px-4 text-foreground w-1/5">Start Time</th>
                    <th className="text-left font-bold py-3 px-4 text-foreground w-1/5">Call Duration</th>
                    <th className="text-left font-bold py-3 px-4 text-foreground w-1/5">Sentiment</th>
                    <th className="text-left font-bold py-3 px-4 text-foreground w-1/5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-foreground">
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-white/10 transition-colors">
                        <td className="py-3 px-4 w-1/5">
                          <span className="text-sm font-semibold">{log.from_phone}</span>
                        </td>
                        <td className="py-3 px-4 w-1/5">
                          <span className="text-sm">{formatDate(log.start_time)}</span>
                        </td>
                        <td className="py-3 px-4 w-1/5">
                          <span className="text-sm">{calculateDuration(log.start_time, log.end_time)}</span>
                        </td>
                        <td className="py-3 px-4 w-1/5">
                          <SentimentRating rating={log.sentiment_score || 0} />
                        </td>
                        <td className="py-3 px-4 w-1/5">
                          <Button
                            onClick={() => handleViewTranscript(log)}
                            className="neumorphic-button-primary"
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
      </div>

      {/* Conversation Transcript Overlay (custom div, not shadcn Dialog) */}
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
                    className="neumorphic-button-primary"
                  >
                    Download
                  </Button>
                  <Button
                    className="neumorphic-button-destructive"
                    onClick={() => {
                      setShowTranscript(false)
                      setSelectedLog(null)
                      setTranscript([])
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>

              {audioUrl && (
                <div className="space-y-2 bg-muted/40 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleToggleAudio}
                        className="neumorphic-button-primary"
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
                        className="neumorphic-button-primary"
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
                        <div
                          className={`w-8 h-8 flex items-center justify-center rounded-full border ${turn.speaker === "A"
                            ? "border-foreground"
                            : "border-foreground"
                            }`}
                        >
                          {turn.speaker === "A" ? (
                            <img
                              src="/ez.svg"
                              alt="Assistant"
                              className="w-5 h-5"
                            />
                          ) : (
                            <IconUserFilled className="w-5 h-5 text-foreground fill-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-line ${turn.speaker === "A"
                          ? "bg-blue-50 border border-blue-200 text-blue-900"
                          : "bg-white border border-foreground/10 text-foreground"
                          }`}>
                          <div className="font-semibold text-xs mb-1 uppercase tracking-wide">
                            {turn.label}
                          </div>
                          <div>
                            {turn.text}
                          </div>
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
