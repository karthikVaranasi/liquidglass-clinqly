import { useState } from "react"
import { IconPhone, IconCheck, IconRefresh, IconX, IconExclamationCircle, IconStar } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import data from "@/data.json"

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
          className={`w-4 h-4 ${
            star <= roundedRating
              ? "fill-current"
              : ""
          }`}
          style={{ color: getSentimentColor(roundedRating) }}
        />
      ))}
    </div>
  )
}

const { callLogs, logsConfig } = data

type CallLog = (typeof callLogs.logs)[number] & { status?: string }

// Assign status to each log based on summary stats distribution
const assignStatusToLogs = (logs: CallLog[]): CallLog[] => {
  const stats = callLogs.summaryStats
  const scheduled = stats.scheduled
  const rescheduled = stats.rescheduled
  const cancelled = stats.cancelled
  const failed = stats.failed

  return logs.map((log, index) => {
    let status = 'scheduled' // default
    
    if (index < scheduled) {
      status = 'scheduled'
    } else if (index < scheduled + rescheduled) {
      status = 'rescheduled'
    } else if (index < scheduled + rescheduled + cancelled) {
      status = 'cancelled'
    } else if (index < scheduled + rescheduled + cancelled + failed) {
      status = 'failed'
    } else {
      status = 'scheduled' // remaining logs default to scheduled
    }
    
    return { ...log, status }
  })
}

const logsWithStatus = assignStatusToLogs(callLogs.logs as CallLog[])

type TranscriptTurn = {
  speaker: "A" | "P"
  label: "Assistant" | "Patient"
  text: string
}

const sampleTranscriptByFrom: Record<string, TranscriptTurn[]> = {
  "+14848001179": [
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Hello, Thank you for calling Martha's Clinic. If this is a medical emergency, please hang up now and dial Nine One One. Otherwise, how can I help you today?",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Hey, hi, my name is Radha Krishna and my date of birth was January 1st, 1996. Can you please book an appointment for me?",
    },
    {
      speaker: "A",
      label: "Assistant",
      text: "Hey Radha! Thanks for that information. Let me just pull up your record real quick.",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "I'm actually new to your clinic.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Perfect! Let me create a new patient record for you real quick. Just to confirm, is the best number to reach you the one you're calling from, or would you prefer a different number?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "No, I'll give you the other number like it's 224-554-9339.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text: "Got it, creating your record.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Excellent! I've created your patient record, Radha. Now, what date would you like to schedule your appointment with Dr. Martha Nelson?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "On December 8th, Monday.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text: "Perfect! Let me check Dr. Nelson's availability for Monday, December 8th.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Great news! Dr. Nelson is available on Monday, December 8th. I have several time slots open. Do you prefer a morning or afternoon appointment?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "Morning appointment?",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Perfect! Here are the morning times I have available: 9:00 AM or 9:30 AM. Which time works better for you?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "...",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Are you still there, Radha? Which time would you prefer – 9:00 AM or 9:30 AM?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "Yes, 9 a.m. is fine for me.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text: "Excellent! Let me book that for you now.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text: "I'm having a little trouble booking that right now. Let me try again for you.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "I apologize, Radha, but I'm unable to complete your booking at the moment due to a system issue. Could you please try calling back in a few minutes, and we'll get you scheduled for that 9:00 AM appointment?",
    },
    {
      speaker: "P",
      label: "Patient",
      text: "Yes please.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Thanks so much for your patience, Radha. We'll get you taken care of when you call back. Have a great day!",
    },
  ],
  "+12245549339": [
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Hi, thanks for calling Martha's Clinic. This is the front desk. How can I help you today?",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Hi, I just wanted to confirm my upcoming appointment and the time.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Absolutely, I'd be happy to confirm that for you. Can I have your full name and date of birth?",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Sure, it's David Johnson, and my date of birth is January 12th, 1985.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Thank you, David. I see you have an appointment booked with Dr. Martha Nelson for a follow-up consultation.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Your appointment is scheduled for tomorrow at 9:00 AM. Please arrive 10 minutes early to complete any paperwork if needed.",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Perfect, thank you so much. That time works for me.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "You're very welcome, David. We look forward to seeing you then. Have a great day!",
    },
  ],
  "+12674679709": [
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Hello, you've reached Martha's Clinic. How can I assist you today?",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Hi, I have a question about my bill and the payment options available.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Of course, I can help with that. Can I have your name and the date of your last visit?",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "My name is Tony, and my last visit was earlier this month.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Thank you, Tony. I see your account here. We accept all major credit cards, debit cards, and HSA cards, and you can also pay your bill online through our patient portal.",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Great, can you text me the link to the portal?",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "Absolutely, I’ll send a secure link to the phone number we have on file ending in 9709. You can use that to view and pay your bill.",
    },
    {
      speaker: "P",
      label: "Patient",
      text:
        "Perfect, thanks for your help.",
    },
    {
      speaker: "A",
      label: "Assistant",
      text:
        "You’re welcome, Tony. If you have any other questions, feel free to call us back. Have a good day!",
    },
  ],
}

const getTranscriptForLog = (log: CallLog): TranscriptTurn[] => {
  return sampleTranscriptByFrom[log.from] ?? []
}

export function LogsPage() {
  const [timeFilter, setTimeFilter] = useState("all-time")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  // Generate random sentiment ratings for demo purposes (whole numbers 1-5)
  const getRandomSentiment = (index: number) => {
    const ratings = [1, 2, 3, 4, 5]
    return ratings[Math.floor((index + Math.random() * 10) % 5)]
  }

  const tableHeaders = [
    { key: 'from', label: 'From' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'duration', label: 'Call Duration' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'action', label: 'Actions' }
  ]

  // Filter logs based on status
  const filteredLogs = statusFilter 
    ? logsWithStatus.filter(log => log.status === statusFilter)
    : logsWithStatus

  // Get filter title
  const getFilterTitle = () => {
    if (!statusFilter) return `All Call Logs (${logsWithStatus.length})`
    const card = logsConfig.summaryCards.find(c => c.key === statusFilter)
    return `${card?.title || 'Filtered'} Call Logs (${filteredLogs.length})`
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

            const isActive = card.key === 'total' 
              ? statusFilter === null 
              : statusFilter === card.key
            const handleCardClick = () => {
              if (card.key === 'total') {
                setStatusFilter(null) // Show all logs
              } else {
                setStatusFilter(isActive ? null : card.key) // Toggle filter
              }
            }

            return (
              <div 
                key={card.key} 
                className={`neumorphic-inset p-4 neumorphic-hover transition-all duration-200 cursor-pointer ${
                  isActive ? 'neumorphic-pressed' : ''
                }`}
                onClick={handleCardClick}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {getIconComponent(card.icon)}
                    {card.title}
                  </div>
                  <div className={`text-2xl font-bold tabular-nums sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl ${getCardColor(card.key)}`}>
                    {callLogs.summaryStats[card.key as keyof typeof callLogs.summaryStats]}
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
                {filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium">{log.from}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{log.startTime}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{log.duration}</span>
                    </td>
                    <td className="py-3 px-4">
                      <SentimentRating rating={getRandomSentiment(index)} />
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowTranscript(true)
                        }}
                        className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                      >
                        View Conversation
                      </Button>
                    </td>
                  </tr>
                ))}
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
                    Conversational Transcript – <span className="font-mono">{selectedLog.from}</span>
                  </h3>
                  <p className="text-xs">
                    Start Time: {selectedLog.startTime} • Duration: {selectedLog.duration}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  >
                    Download
                  </Button>
                  <Button
                    className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                    onClick={() => {
                      setShowTranscript(false)
                      setSelectedLog(null)
                    }}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto bg-card rounded-lg p-4 text-sm space-y-3">
                {getTranscriptForLog(selectedLog).length === 0 ? (
                  <p className="text-sm">
                    No transcript available for this call yet.
                  </p>
                ) : (
                  getTranscriptForLog(selectedLog).map((turn, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center mt-0.5">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                            turn.speaker === "A"
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
