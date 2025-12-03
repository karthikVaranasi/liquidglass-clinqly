import { useState, useEffect, useRef } from 'react';
import { Phone, Eye, X, Download, User, MessageSquare, Building2, Bot, Search, ArrowLeft, Play, Pause, Volume2, Star } from 'lucide-react';
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
  call_id?: string;
  from_phone: string | null;
  to_phone: string | null;
  start_time: string | null;
  end_time: string | null;
  agent_type?: string;
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
  audio?: string | null;
  call_id?: string;
  id?: number;
  created_at?: string;
  updated_at?: string;
}



interface PathwayLog {
  log_id: number;
  call_id: string;
  webhook_classification: {
    url: string;
    method: string;
    request_body: Record<string, unknown> | null;
    response_status: string | null;
    response_body: Record<string, unknown> | null;
  };
}

interface PathwayLogsData {
  log_id: number;
  call_id: string;
  pathway_logs: PathwayLog[];
  webhook_summary: Record<string, unknown>[];
  call_ended_by: string;
  concatenated_transcript: string;
  total_pathway_entries: number;
}

interface Clinic {
  id: number;
  name: string;
  phone_number: string;
  logo_url: string | null;
  address: string | null;
}

interface ClinicWithCount extends Clinic {
  callCount: number;
}



export default function Logs() {
  const [allLogs, setAllLogs] = useState<Log[]>([]); // Store all logs for filtering
  const [clinics, setClinics] = useState<ClinicWithCount[]>([]);
  const [selectedClinicPhone, setSelectedClinicPhone] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<ClinicWithCount | null>(null);
  const [isBotSelected, setIsBotSelected] = useState(false); // Track if Ezmedtech Bot is selected
  const [showCardsView, setShowCardsView] = useState(true); // Show cards initially
  const [loading, setLoading] = useState(true);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [normalizedTranscripts, setNormalizedTranscripts] = useState<NormalizedTranscript[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'yesterday' | 'weekly'>('all');
  const [pathwayLogsData, setPathwayLogsData] = useState<PathwayLogsData | null>(null);
  const [pathwayLogsLoading, setPathwayLogsLoading] = useState(false);
  const [pathwayLogsError, setPathwayLogsError] = useState<string | null>(null);
  const [showPathwayModal, setShowPathwayModal] = useState(false);
  const [clinicSearchQuery, setClinicSearchQuery] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    // Fetch both clinics and logs on component mount
    const loadData = async () => {
      try {
        // Fetch logs first, then use them to calculate clinic counts
        const logsResponse = await axiosInstance.get<Log[]>('/dashboard/logs');
        
        // Handle different response structures
        let logsData: Log[] = [];
        
        if (Array.isArray(logsResponse.data)) {
          logsData = logsResponse.data;
        } else if (logsResponse.data && typeof logsResponse.data === 'object') {
          // Check if response is wrapped in a data property
          if (Array.isArray((logsResponse.data as any).data)) {
            logsData = (logsResponse.data as any).data;
          } else if (Array.isArray((logsResponse.data as any).logs)) {
            logsData = (logsResponse.data as any).logs;
          } else if (Array.isArray((logsResponse.data as any).results)) {
            logsData = (logsResponse.data as any).results;
          } else {
            // If it's a single object, wrap it in an array
            logsData = [logsResponse.data as Log];
          }
        }
        
        setAllLogs(logsData);
        
        // Fetch clinics and calculate counts with the logs data
        await fetchClinics(logsData);
        
        // Logs will be filtered by getFilteredLogs() based on current filters
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Still try to fetch clinics even if logs fail
        await fetchClinics([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClinics = async (logsForCounting?: Log[]) => {
    try {
      setClinicsLoading(true);
      const response = await axiosInstance.get<{ clinics: Clinic[] }>('/dashboard/clinics');
      const data = response.data;
      const clinicsList: Clinic[] = data.clinics || [];

      // Use provided logs or allLogs to calculate counts
      const logsToUse = logsForCounting || allLogs;
      
      // Always calculate call counts
      const clinicsWithCounts: ClinicWithCount[] = clinicsList.map(clinic => {
        const phoneNumber = clinic.phone_number;
        const callCount = logsToUse.filter(log =>
          log.from_phone === phoneNumber || log.to_phone === phoneNumber
        ).length;

        return {
          ...clinic,
          callCount
        };
      });
      setClinics(clinicsWithCounts);
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setClinicsLoading(false);
    }
  };

  const fetchLogs = async (status?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = status 
        ? `/dashboard/logs?status=${status}`
        : `/dashboard/logs`;
      const response = await axiosInstance.get<Log[]>(url);
      
      // Handle different response structures
      let data: Log[] = [];
      
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Check if response is wrapped in a data property
        if (Array.isArray((response.data as any).data)) {
          data = (response.data as any).data;
        } else if (Array.isArray((response.data as any).logs)) {
          data = (response.data as any).logs;
        } else if (Array.isArray((response.data as any).results)) {
          data = (response.data as any).results;
        } else {
          // If it's a single object, wrap it in an array
          data = [response.data as Log];
        }
      }
      
      setAllLogs(data); // Store all logs
      
      // Always update clinic counts with fresh logs data
      // This ensures counts are always accurate
      await fetchClinics(data);
      
      // Logs will be filtered by getFilteredLogs() based on current filters
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update clinic counts whenever allLogs changes
  useEffect(() => {
    if (allLogs.length >= 0 && clinics.length > 0) {
      // Recalculate counts whenever logs change
      const clinicsWithCounts: ClinicWithCount[] = clinics.map(clinic => {
        const phoneNumber = clinic.phone_number;
        const normalizedClinicPhone = normalizePhoneForComparison(phoneNumber);
        const callCount = allLogs.filter(log => {
          const normalizedFrom = normalizePhoneForComparison(log.from_phone);
          const normalizedTo = normalizePhoneForComparison(log.to_phone);
          return normalizedFrom === normalizedClinicPhone || normalizedTo === normalizedClinicPhone;
        }).length;
        return {
          ...clinic,
          callCount
        };
      });
      setClinics(clinicsWithCounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLogs]); // Update when allLogs changes

  // Normalize phone number for comparison (remove all non-digit characters)
  const normalizePhoneForComparison = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Remove all non-digit characters
  };

  const getFilteredLogs = () => {
    const now = dayjs().tz(EST_TIMEZONE);
    
    let filtered = allLogs;

    // Apply bot filter if Ezmedtech Bot is selected
    if (isBotSelected) {
      filtered = filtered.filter(log =>
        !log.from_phone && !log.to_phone
      );
    }
    // Apply clinic filter if one is selected
    else if (selectedClinicPhone) {
      const normalizedClinicPhone = normalizePhoneForComparison(selectedClinicPhone);
      
      filtered = filtered.filter(log => {
        const normalizedFrom = normalizePhoneForComparison(log.from_phone);
        const normalizedTo = normalizePhoneForComparison(log.to_phone);
        return normalizedFrom === normalizedClinicPhone || normalizedTo === normalizedClinicPhone;
      });
    }
    
    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(log => log.status === selectedStatus);
    }
    
    // Apply date filter
    switch (selectedDateFilter) {
      case 'today':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
        });
        break;
      case 'yesterday':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.subtract(1, 'day').format("YYYY-MM-DD");
        });
        break;
      case 'weekly':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          const weekStart = now.startOf('week'); // Start of current week (Sunday)
          const weekEnd = now.endOf('week'); // End of current week (Saturday)
          return logDate.isValid() && logDate.isBetween(weekStart, weekEnd, null, '[]'); // Inclusive range
        });
        break;
      case 'all':
      default:
        // No date filtering
        break;
    }
    
    // Sort by start_time in descending order (most recent first)
    filtered.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      
      const dateA = dayjs.utc(a.start_time).valueOf();
      const dateB = dayjs.utc(b.start_time).valueOf();
      return dateB - dateA; // Descending order (newest first)
    });
    
    return filtered;
  };

  // Function to get logs filtered by date only (for stat cards)
  const getDateFilteredLogs = () => {
    const now = dayjs().tz(EST_TIMEZONE);
    
    let filtered = allLogs;

    // Apply bot filter if Ezmedtech Bot is selected
    if (isBotSelected) {
      filtered = filtered.filter(log =>
        !log.from_phone && !log.to_phone
      );
    }
    // Apply clinic filter if one is selected
    else if (selectedClinicPhone) {
      filtered = filtered.filter(log =>
        log.from_phone === selectedClinicPhone || log.to_phone === selectedClinicPhone
      );
    }
    
    // Apply date filter only
    switch (selectedDateFilter) {
      case 'today':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
        });
        break;
      case 'yesterday':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          return logDate.isValid() && logDate.format("YYYY-MM-DD") === now.subtract(1, 'day').format("YYYY-MM-DD");
        });
        break;
      case 'weekly':
        filtered = filtered.filter(log => {
          if (!log.start_time) return false;
          // Convert UTC to EST for comparison
          const logDate = dayjs.utc(log.start_time).tz(EST_TIMEZONE);
          const weekStart = now.startOf('week'); // Start of current week (Sunday)
          const weekEnd = now.endOf('week'); // End of current week (Saturday)
          return logDate.isValid() && logDate.isBetween(weekStart, weekEnd, null, '[]'); // Inclusive range
        });
        break;
      case 'all':
      default:
        // No date filtering
        break;
    }
    
    return filtered;
  };

  const handleStatusFilterChange = async (status: string) => {
    setSelectedStatus(status);
  };

  const handleDateFilterChange = (filter: 'all' | 'today' | 'yesterday' | 'weekly') => {
    setSelectedDateFilter(filter);
  };

  // Note: We use getFilteredLogs() directly in the render instead of maintaining a separate logs state

  const getClinicInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Filter clinics based on search query
  const getFilteredClinics = () => {
    if (!clinicSearchQuery.trim()) {
      return clinics;
    }
    const query = clinicSearchQuery.toLowerCase().trim();
    return clinics.filter(clinic =>
      clinic.name.toLowerCase().includes(query) ||
      clinic.phone_number.includes(query)
    );
  };

  const handleCardClick = (clinic: ClinicWithCount | null, isBot: boolean = false) => {
    if (isBot) {
      // "Ezmedtech Bot" clicked
      setSelectedClinic(null);
      setSelectedClinicPhone(null);
      setIsBotSelected(true);
      setShowCardsView(false);
    } else if (clinic) {
      setSelectedClinic(clinic);
      setSelectedClinicPhone(clinic.phone_number);
      setIsBotSelected(false);
      setShowCardsView(false);
    } else {
      // "All Calls" clicked
      setSelectedClinic(null);
      setSelectedClinicPhone(null);
      setIsBotSelected(false);
      setShowCardsView(false);
    }
    // Reset filters when switching views
    setSelectedStatus("");
    setSelectedDateFilter('all'); // Reset date filter to show all logs
  };

  // Calculate bot call count
  const getBotCallCount = () => {
    return allLogs.filter(log => !log.from_phone && !log.to_phone).length;
  };

  const handleViewPathwayLogs = async (log: Log) => {
    setSelectedLog(log);
    setShowPathwayModal(true);
    setPathwayLogsLoading(true);
    setPathwayLogsError(null);
    
    try {
      const response = await axiosInstance.get(`/dashboard/logs/pathway-logs?id=${log.id}`);
      setPathwayLogsData(response.data);
    } catch (err) {
      setPathwayLogsError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPathwayLogsLoading(false);
    }
  };

  const closePathwayModal = () => {
    setShowPathwayModal(false);
    setSelectedLog(null);
    setPathwayLogsData(null);
    setPathwayLogsError(null);
  };

  const closeModal = () => {
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Cleanup audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    setShowModal(false);
    setSelectedLog(null);
    setNormalizedTranscripts([]);
    setTranscriptError(null);
    setPathwayLogsData(null);
    setPathwayLogsError(null);
  };

  // Audio player controls
  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatPhoneNumber = (phone: string | null | undefined, type: 'from' | 'to' = 'from') => {
    // Handle null or undefined phone numbers
    if (!phone) {
      return type === 'from' ? 'User' : 'Bot';
    }
    
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const extractPathFromUrl = (url: string | null | undefined) => {
    if (!url) {
      return 'N/A';
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // If URL parsing fails, try to extract path manually
      const match = url.match(/https?:\/\/[^/]+(\/.*)/);
      return match ? match[1] : url;
    }
  };

  const formatDateTime = (dateTime: string | null | undefined) => {
    if (!dateTime) {
      return 'N/A';
    }
    
    // Convert UTC to EST for display
    const date = dayjs.utc(dateTime).tz(EST_TIMEZONE);
    return date.format('MMM D, YYYY h:mm A');
  };

  const getCallDuration = (startTime: string | null | undefined, endTime: string | null | undefined) => {
    if (!startTime || !endTime) {
      return 'N/A';
    }
    
    // Convert UTC times to EST for duration calculation
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
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    
    try {
      const response = await axiosInstance.get<TranscriptData>(`/dashboard/logs/transcript?id=${log.id}`);
      const data = response.data;
      
      
      // Check if data is null or empty
      if (!data) {
        throw new Error('No transcript data available for this call');
      }
      
      // Handle audio if present
      if (data.audio && data.audio !== null) {
        try {
          // Convert base64 to blob
          const base64Data = data.audio;
          // Remove data URL prefix if present
          const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        } catch (audioErr) {
          console.error('Error processing audio:', audioErr);
        }
      }
      
      // Handle case where transcripts might be null
      if (!data.transcripts && !data.transcription && !data.transcript) {
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
            onClick={() => fetchLogs()}
            className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button - Only show when not in cards view */}
        {!showCardsView && (
          <div className="mb-4">
            <button
              onClick={() => {
                setShowCardsView(true);
                setSelectedClinic(null);
                setSelectedClinicPhone(null);
                setIsBotSelected(false);
                setSelectedStatus("");
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isBotSelected ? 'Ezmedtech Bot - Call Logs' : selectedClinic ? `${selectedClinic.name} - Call Logs` : 'Call Logs'}
              </h1>
              <p className="text-gray-600">
                {isBotSelected 
                  ? 'View and manage chatbot interactions from ezmedtech.ai'
                  : selectedClinic 
                    ? `View and manage call logs for ${selectedClinic.name}`
                    : 'View and manage all call logs and transcripts'
                }
              </p>
            </div>
            {showCardsView && (
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clinics by name or phone..."
                  value={clinicSearchQuery}
                  onChange={(e) => setClinicSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007C91] focus:border-[#007C91]"
                />
                {clinicSearchQuery && (
                  <button
                    onClick={() => setClinicSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table View - Show initially or when back button is clicked */}
        {showCardsView && (
          <div className="mb-8">

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 tracking-wider">
                        Logo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 tracking-wider">
                        Clinic Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                        Total Calls
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* All Calls Row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg bg-[#007C91] text-white flex items-center justify-center">
                          <Phone className="w-6 h-6" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">All Calls</div>
                        <div className="text-sm text-gray-500">View all call logs across all clinics</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-bold text-[#007C91]">{allLogs.length}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCardClick(null)}
                          className="inline-flex items-center px-4 py-2 bg-[#007C91] text-white text-sm font-medium rounded-md hover:bg-[#005a6b] transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Logs
                        </button>
                      </td>
                    </tr>

                    {/* Ezmedtech Bot Row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg bg-[#007C91] text-white flex items-center justify-center">
                          <Bot className="w-6 h-6" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">Ezmedtech Bot</div>
                        <div className="text-sm text-gray-500">Chatbot interactions from ezmedtech.ai</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-bold text-[#007C91]">{getBotCallCount()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCardClick(null, true)}
                          className="inline-flex items-center px-4 py-2 bg-[#007C91] text-white text-sm font-medium rounded-md hover:bg-[#005a6b] transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Logs
                        </button>
                      </td>
                    </tr>

                    {/* Clinic Rows */}
                    {clinicsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007C91] mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading clinics...</p>
                          </div>
                        </td>
                      </tr>
                    ) : getFilteredClinics().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8">
                          <div className="text-center">
                            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No clinics found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      getFilteredClinics().map((clinic) => (
                        <tr 
                          key={clinic.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {clinic.logo_url ? (
                              <img
                                src={clinic.logo_url}
                                alt={clinic.name}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const initialsDiv = document.createElement('div');
                                    initialsDiv.className = 'w-12 h-12 rounded-lg bg-[#007C91] text-white flex items-center justify-center font-semibold text-sm';
                                    initialsDiv.textContent = getClinicInitials(clinic.name);
                                    parent.appendChild(initialsDiv);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#007C91] text-white flex items-center justify-center font-semibold text-sm">
                                {getClinicInitials(clinic.name)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">{clinic.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {clinic.address || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Phone className="w-4 h-4" />
                              <span>{clinic.phone_number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-lg font-bold text-[#007C91]">{clinic.callCount}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleCardClick(clinic)}
                              className="inline-flex items-center px-4 py-2 bg-[#007C91] text-white text-sm font-medium rounded-md hover:bg-[#005a6b] transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Logs
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Status Counts Cards - Only show when a card is selected (not in cards view) */}
        {!showCardsView && (
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
        )}

        {/* Logs Table - Only show when a card is selected (not in cards view) */}
        {!showCardsView && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedStatus ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Calls` : 'All Call Logs'}
              {selectedDateFilter !== 'all' && ` - ${selectedDateFilter.charAt(0).toUpperCase() + selectedDateFilter.slice(1)}`}
              {` (${getFilteredLogs().length})`}
            </h2>
            
            {/* Date Filter Dropdown */}
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
          ) : getFilteredLogs().length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No call logs found</p>
              {selectedClinicPhone && allLogs.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  The logs in the system don't match this clinic's phone number ({selectedClinicPhone}).
                  <br />
                  Click "All Calls" to view all logs, or check if the logs belong to a different clinic.
                </p>
              )}
              <div className="text-xs text-gray-400 mt-2 space-y-1">
                <p>Total logs in state: {allLogs.length}</p>
                <p>Filtered logs: {getFilteredLogs().length}</p>
                <p>Status filter: {selectedStatus || 'none'}</p>
                <p>Date filter: {selectedDateFilter}</p>
                <p>Clinic filter: {selectedClinicPhone || 'none'}</p>
                <p>Bot selected: {isBotSelected ? 'yes' : 'no'}</p>
                {allLogs.length > 0 && selectedClinicPhone && (
                  <div className="mt-2 text-xs">
                    <p>Sample log phone numbers (first 3 logs):</p>
                    {allLogs.slice(0, 3).map((log) => (
                      <p key={log.id} className="text-gray-500">
                        Log {log.id}: From={log.from_phone || 'N/A'}, To={log.to_phone || 'N/A'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
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
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
                      Call Duration
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
                  {getFilteredLogs().map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {formatPhoneNumber(log.from_phone, 'from')}
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
                            className="flex items-center justify-center text-[#007C91] transition-colors text-xs px-3 py-2 border border-[#007C91] rounded hover:bg-[#007C91] hover:text-white"
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
        )}
      </div>

      {/* Transcript Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeModal}
          />
          
          <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Conversational Transcript - {selectedLog ? formatPhoneNumber(selectedLog.from_phone, 'from') : 'Call'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {audioUrl && (
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center px-3 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors text-sm"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Play Audio
                      </>
                    )}
                  </button>
                )}
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <Volume2 className="w-5 h-5 text-gray-400 mr-2" />
                    <h3 className="text-sm font-semibold text-gray-900">Call Recording</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-[#007C91] text-white hover:bg-[#005a6b] transition-colors flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max={audioDuration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#007C91]"
                      />
                    </div>
                    <div className="text-xs text-gray-600 min-w-[70px] text-right">
                      {formatTime(currentTime)} / {formatTime(audioDuration)}
                    </div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              )}
              {/* Transcript */}
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

      {/* Pathway Logs Modal */}
      {showPathwayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50"
            onClick={closePathwayModal}
          />
          
          <div className="relative bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  API Error Trace - {selectedLog ? formatPhoneNumber(selectedLog.from_phone, 'from') : 'Call'}
                </h2>
                {pathwayLogsData && (
                  <p className="text-sm text-gray-600 mt-1">
                    Call ID: {pathwayLogsData.call_id} | Total API Calls: {pathwayLogsData.total_pathway_entries}
                  </p>
                )}
              </div>
              <button
                onClick={closePathwayModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {pathwayLogsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007C91] mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading pathway logs...</p>
                </div>
              ) : pathwayLogsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{pathwayLogsError}</p>
                  <button
                    onClick={() => selectedLog && handleViewPathwayLogs(selectedLog)}
                    className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : pathwayLogsData ? (
                <div className="space-y-6">
                  {/* API Call Flow */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">API Call Flow</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-4">
                        {pathwayLogsData.pathway_logs.map((log, index) => {
                          const isError = log.webhook_classification.response_status && 
                            (log.webhook_classification.response_status.includes('500') || 
                             log.webhook_classification.response_status.includes('400') ||
                             log.webhook_classification.response_status.includes('Error'));
                          
                          return (
                            <div key={index} className={`border rounded-lg p-4 ${isError ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    Step {index + 1}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    isError 
                                      ? 'bg-red-100 text-red-800' 
                                      : log.webhook_classification.response_status?.includes('200') || log.webhook_classification.response_status?.includes('201')
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.webhook_classification.response_status || 'Pending'}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {log.webhook_classification.method}
                                </span>
                              </div>
                              
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Endpoint:</p>
                                <p className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                                  {extractPathFromUrl(log.webhook_classification.url)}
                                </p>
                              </div>

                              {log.webhook_classification.request_body && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Request Body:</p>
                                  <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.webhook_classification.request_body, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.webhook_classification.response_body && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Response:</p>
                                  <pre className={`text-xs p-2 rounded overflow-x-auto ${
                                    isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {JSON.stringify(log.webhook_classification.response_body, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {isError && (
                                <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
                                  <p className="text-sm font-medium text-red-800 mb-1">🚨 Error Detected:</p>
                                  <p className="text-sm text-red-700">
                                    {String((log.webhook_classification.response_body as Record<string, unknown>)?.error || 
                                     (log.webhook_classification.response_body as Record<string, unknown>)?.message || 
                                     'Unknown error occurred')}
                                  </p>
                                  {Boolean((log.webhook_classification.response_body as Record<string, unknown>)?.details) && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Details: {String((log.webhook_classification.response_body as Record<string, unknown>)?.details || '')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Call Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Call Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Call Ended By</p>
                        <p className="font-medium">{pathwayLogsData.call_ended_by}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                        <p className="font-medium">{pathwayLogsData.total_pathway_entries}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pathway logs available for this call</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 