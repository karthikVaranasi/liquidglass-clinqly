import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Phone, Eye, ArrowLeft, Download, User, MessageSquare, X, Star } from 'lucide-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import axiosInstance from '../../../utils/axiosInstance';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// Configure EST timezone
const EST_TIMEZONE = 'America/New_York';

interface Log {
  id: number;
  from_phone: string | null;
  to_phone: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  sentiment_score: number | null;
}

// Bland format
interface BlandTranscript {
  id: number;
  text: string;
  user: string;
  created_at: string;
}

// ElevenLabs format
interface ElevenLabsTranscript {
  role: string;
  message: string;
}

// Normalized format for internal use
interface NormalizedTranscript {
  id: number | string;
  text: string;
  user: string;
  created_at: string | null;
}

interface TranscriptData {
  transcripts?: (BlandTranscript | ElevenLabsTranscript)[];
  transcription?: (BlandTranscript | ElevenLabsTranscript)[];
  transcript?: string | (BlandTranscript | ElevenLabsTranscript)[];
  status?: string;
  agent_type?: string;
}

interface Clinic {
  id: number;
  name: string;
  phone_number: string;
  logo_url: string | null;
  address: string | null;
}

export default function ClinicLogsDetail() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [searchParams] = useSearchParams();
  const phoneNumber = searchParams.get('phone');
  const navigate = useNavigate();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [allLogs, setAllLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [normalizedTranscripts, setNormalizedTranscripts] = useState<NormalizedTranscript[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'yesterday' | 'weekly'>('all');

  // Helper function to normalize different transcript formats
  const normalizeTranscripts = (data: TranscriptData): NormalizedTranscript[] => {
    if (!data) return [];
    
    // Handle both 'transcripts', 'transcription', and 'transcript' field names
    let transcriptsArray = data.transcripts || data.transcription || data.transcript;
    
    // If transcript is a string, try to parse it as JSON
    if (typeof transcriptsArray === 'string') {
      try {
        transcriptsArray = JSON.parse(transcriptsArray);
      } catch (e) {
        console.error('Failed to parse transcript string:', e);
        return [];
      }
    }
    
    if (!transcriptsArray || !Array.isArray(transcriptsArray) || transcriptsArray.length === 0) return [];

    // Check if it's Bland format (has 'id' field)
    const isBlandFormat = transcriptsArray.length > 0 && transcriptsArray[0] && 'id' in transcriptsArray[0];

    if (isBlandFormat) {
      return (transcriptsArray as BlandTranscript[]).map(t => ({
        id: t.id,
        text: t.text || '',
        user: t.user || 'unknown',
        created_at: t.created_at || null
      }));
    } else {
      // ElevenLabs format or similar
      return (transcriptsArray as ElevenLabsTranscript[]).map((t, index) => ({
        id: `transcript-${index}`,
        text: t.message || '',
        user: t.role === 'agent' ? 'assistant' : 'user',
        created_at: null
      }));
    }
  };

  useEffect(() => {
    // Always fetch both clinic info and logs
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch both endpoints
        const [clinicsResponse, logsResponse] = await Promise.all([
          axiosInstance.get('/dashboard/clinics'),
          axiosInstance.get('/dashboard/logs')
        ]);

        // Handle clinic data
        if (clinicId) {
          const clinicsData = clinicsResponse.data;
          const clinicData = clinicsData.clinics?.find((c: Clinic) => c.id === parseInt(clinicId || '0'));
          setClinic(clinicData || null);
        }

        // Handle logs data
        const logsData: Log[] = logsResponse.data;

        // Filter logs by phone number (from_phone or to_phone matches clinic phone)
        let filteredLogs = logsData;
        if (phoneNumber) {
          filteredLogs = logsData.filter(log =>
            log.from_phone === phoneNumber || log.to_phone === phoneNumber
          );
        }

        setAllLogs(filteredLogs);
        setLogs(filteredLogs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clinicId, phoneNumber]);

  const getFilteredLogs = () => {
    const now = dayjs().tz(EST_TIMEZONE);

    let filtered = allLogs;

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(log => log.status === selectedStatus);
    }

    // Apply date filter
    switch (selectedDateFilter) {
      case 'today':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
        });
        break;
      case 'yesterday':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.subtract(1, 'day').format("YYYY-MM-DD");
        });
        break;
      case 'weekly':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          const weekStart = now.startOf('week');
          const weekEnd = now.endOf('week');
          return logDate.isValid() && logDate.isBetween(weekStart, weekEnd, null, '[]');
        });
        break;
      case 'all':
      default:
        break;
    }

    // Sort by start_time in descending order
    filtered.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;

      const dateA = dayjs.utc(a.start_time).valueOf();
      const dateB = dayjs.utc(b.start_time).valueOf();
      return dateB - dateA;
    });

    return filtered;
  };

  const getDateFilteredLogs = () => {
    const now = dayjs().tz(EST_TIMEZONE);

    let filtered = allLogs;

    switch (selectedDateFilter) {
      case 'today':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
        });
        break;
      case 'yesterday':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.subtract(1, 'day').format("YYYY-MM-DD");
        });
        break;
      case 'weekly':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          const weekStart = now.startOf('week');
          const weekEnd = now.endOf('week');
          return logDate.isValid() && logDate.isBetween(weekStart, weekEnd, null, '[]');
        });
        break;
      case 'all':
      default:
        break;
    }

    return filtered;
  };

  const handleStatusFilterChange = async (status: string) => {
    setSelectedStatus(status);
    const filtered = getFilteredLogs();
    setLogs(filtered);
  };

  const handleDateFilterChange = (filter: 'all' | 'today' | 'yesterday' | 'weekly') => {
    setSelectedDateFilter(filter);
    const filtered = getFilteredLogs();
    setLogs(filtered);
  };

  useEffect(() => {
    const filtered = getFilteredLogs();
    setLogs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedDateFilter, allLogs]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
    setNormalizedTranscripts([]);
    setTranscriptError(null);
  };

  const formatPhoneNumber = (phone: string | null | undefined, type: 'from' | 'to' = 'from') => {
    // Handle null or undefined phone numbers
    if (!phone) {
      return type === 'from' ? 'User' : 'Bot';
    }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDateTime = (dateTime: string | null | undefined) => {
    if (!dateTime) {
      return 'N/A';
    }
    const date = dayjs.utc(dateTime).tz(EST_TIMEZONE);
    return date.format('MMM D, YYYY h:mm A');
  };

  const getCallDuration = (startTime: string | null | undefined, endTime: string | null | undefined) => {
    if (!startTime || !endTime) {
      return 'N/A';
    }
    const start = dayjs.utc(startTime).tz(EST_TIMEZONE);
    const end = dayjs.utc(endTime).tz(EST_TIMEZONE);
    const durationMs = end.valueOf() - start.valueOf();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Convert sentiment score (-1 to 1) to 5-star rating (0 to 5)
  const sentimentToStars = (sentiment: number | null): number => {
    if (sentiment === null) return 0;
    // Map -1 to 0 stars, 0 to 2.5 stars, 1 to 5 stars
    return Math.round(((sentiment + 1) / 2) * 5);
  };

  // Get color based on sentiment score
  const getSentimentColor = (sentiment: number | null): string => {
    if (sentiment === null) return 'text-gray-300';
    if (sentiment < -0.5) return 'text-red-500';
    if (sentiment < 0) return 'text-orange-500';
    if (sentiment < 0.5) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Render sentiment stars
  const renderSentimentStars = (sentiment: number | null) => {
    if (sentiment === null) {
      return (
        <div className="flex items-center justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-4 h-4 text-gray-300 fill-gray-300" />
          ))}
        </div>
      );
    }

    const filledStars = sentimentToStars(sentiment);
    const color = getSentimentColor(sentiment);

    return (
      <div className="flex items-center justify-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= filledStars ? `${color} fill-current` : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const handleViewTranscript = async (log: Log) => {
    setSelectedLog(log);
    setShowModal(true);
    setTranscriptLoading(true);
    setTranscriptError(null);
    setNormalizedTranscripts([]);

    try {
      const response = await axiosInstance.get(`/dashboard/logs/transcript?id=${log.id}`);
      const data = response.data;
      
      // Check if data is null or empty
      if (!data) {
        throw new Error('No transcript data available for this call');
      }
      
      // Handle case where transcripts might be null
      if (!data.transcripts && !data.transcription) {
        setNormalizedTranscripts([]);
        return;
      }
      
      setNormalizedTranscripts(normalizeTranscripts(data));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching transcript';
      setTranscriptError(errorMessage);
      setNormalizedTranscripts([]);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!normalizedTranscripts || normalizedTranscripts.length === 0 || !selectedLog) return;

    const content = `Call Transcript - ID: ${selectedLog.id}
Date: ${formatDateTime(selectedLog.start_time)}
Duration: ${getCallDuration(selectedLog.start_time, selectedLog.end_time)}
From: ${formatPhoneNumber(selectedLog.from_phone, 'from')}
To: ${formatPhoneNumber(selectedLog.to_phone, 'to')}

Transcript:
${normalizedTranscripts.map(t => {
  const speaker = t.user === 'assistant' || t.user === 'agent' ? 'Assistant' : 'Patient';
  return `${speaker}: ${t.text}`;
}).join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${selectedLog.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/logs/clinics')}
            className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
          >
            Back to Clinics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/logs/clinics')}
            className="flex items-center text-[#007C91] hover:text-[#005a6b] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clinics
          </button>

          <div className="flex items-center gap-4 mb-2">
            {clinic?.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {clinic?.name || 'Clinic Logs'}
              </h1>
              <p className="text-gray-600">View and manage call logs for this clinic</p>
            </div>
          </div>
        </div>

        {/* Status Counts Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div
            className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedStatus === "" ? 'ring-2 ring-blue-300' : ''}`}
            onClick={() => handleStatusFilterChange("")}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getDateFilteredLogs().length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedStatus === "scheduled" ? 'ring-2 ring-green-300' : ''}`}
            onClick={() => handleStatusFilterChange("scheduled")}
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-green-600">
                  {getDateFilteredLogs().filter(log => log.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedStatus === "rescheduled" ? 'ring-2 ring-orange-300' : ''}`}
            onClick={() => handleStatusFilterChange("rescheduled")}
          >
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rescheduled</p>
                <p className="text-2xl font-bold text-orange-600">
                  {getDateFilteredLogs().filter(log => log.status === 'rescheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedStatus === "cancelled" ? 'ring-2 ring-red-300' : ''}`}
            onClick={() => handleStatusFilterChange("cancelled")}
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Phone className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {getDateFilteredLogs().filter(log => log.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedStatus === "failure" ? 'ring-2 ring-gray-300' : ''}`}
            onClick={() => handleStatusFilterChange("failure")}
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Phone className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-600">
                  {getDateFilteredLogs().filter(log => log.status === 'failure').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedStatus ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Calls` : 'All Call Logs'}
              {selectedDateFilter !== 'all' && ` - ${selectedDateFilter.charAt(0).toUpperCase() + selectedDateFilter.slice(1)}`}
              {` (${logs.length})`}
            </h2>

            <div className="flex items-center">
              <label htmlFor="dateFilter" className="text-sm font-medium text-gray-700 mr-2">
                Filter by:
              </label>
              <select
                id="dateFilter"
                value={selectedDateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value as 'all' | 'today' | 'yesterday')}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#007C91] focus:border-[#007C91]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="weekly">This Week</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007C91] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No call logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {formatPhoneNumber(log.from_phone, 'from')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {formatPhoneNumber(log.to_phone, 'to')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {formatDateTime(log.start_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {getCallDuration(log.start_time, log.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {renderSentimentStars(log.sentiment_score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleViewTranscript(log)}
                            className="flex items-center justify-center text-[#007C91] hover:text-[#005a6b] transition-colors text-xs px-3 py-2 border border-[#007C91] rounded hover:bg-[#007C91] hover:text-white"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Conversation
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeModal}
          />

          <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Conversational Transcript - {selectedLog ? formatPhoneNumber(selectedLog.from_phone, 'from') : 'Call'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTranscript}
                  className="flex items-center px-3 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4">
                  {transcriptLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007C91] mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading transcript...</p>
                    </div>
                  ) : transcriptError ? (
                    <div className="text-center py-8">
                      <p className="text-red-500 mb-4">{transcriptError}</p>
                      <button
                        onClick={() => selectedLog && handleViewTranscript(selectedLog)}
                        className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : normalizedTranscripts && normalizedTranscripts.length > 0 ? (
                    <div className="space-y-4">
                      {normalizedTranscripts.map((transcript) => {
                        const isAssistant = transcript.user === 'assistant' || transcript.user === 'agent';
                        const isAgentAction = transcript.user === 'agent-action';

                        if (isAgentAction) {
                          return (
                            <div key={transcript.id} className="flex justify-center">
                              <div className="bg-gray-100 px-3 py-1 rounded-full">
                                <span className="text-xs text-gray-600 italic">{transcript.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={transcript.id} className="flex">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              isAssistant
                                ? 'bg-[#007C91] text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <span className={`text-sm font-medium ${
                                  isAssistant
                                    ? 'text-[#007C91]'
                                    : 'text-gray-700'
                                }`}>
                                  {isAssistant ? 'Assistant' : 'Patient'}
                                </span>
                                {transcript.created_at && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatDateTime(transcript.created_at)}
                                  </span>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-gray-900 whitespace-pre-wrap text-sm">{transcript.text}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No transcript available for this call</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

