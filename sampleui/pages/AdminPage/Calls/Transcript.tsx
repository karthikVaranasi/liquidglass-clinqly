import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, User, MessageSquare, Download } from 'lucide-react';
import axiosInstance from '../../../utils/axiosInstance';

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

interface TranscriptApiResponse {
  transcripts?: (BlandTranscript | ElevenLabsTranscript)[];
  transcription?: (BlandTranscript | ElevenLabsTranscript)[];
  transcript?: string | (BlandTranscript | ElevenLabsTranscript)[];
  status?: string;
  agent_type?: string;
}

interface LogInfo {
  id: number;
  from_phone: string | null;
  to_phone: string | null;
  start_time: string;
  end_time: string;
}

export default function Transcript() {
  const [searchParams] = useSearchParams();
  const logId = searchParams.get('id');
  const navigate = useNavigate();
  
  const [normalizedTranscripts, setNormalizedTranscripts] = useState<NormalizedTranscript[]>([]);
  const [logInfo, setLogInfo] = useState<LogInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to normalize different transcript formats
  const normalizeTranscripts = (data: TranscriptApiResponse): NormalizedTranscript[] => {
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

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      setNormalizedTranscripts([]);
      
      const response = await axiosInstance.get<TranscriptApiResponse>(`/dashboard/logs/transcript?id=${logId}`);
      const data = response.data;
      
      // Check if data is null or empty
      if (!data) {
        throw new Error('No transcript data available for this call');
      }
      
      // Handle case where transcripts might be null
      if (!data.transcripts && !data.transcription && !data.transcript) {
        setNormalizedTranscripts([]);
        return;
      }
      
      const normalized = normalizeTranscripts(data);
      console.log('Normalized transcripts:', normalized);
      setNormalizedTranscripts(normalized);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching transcript';
      setError(errorMessage);
      setNormalizedTranscripts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogInfo = async () => {
    try {
      const response = await axiosInstance.get<LogInfo[]>('/dashboard/logs');
      const logs = response.data;
      const log = logs.find((l: LogInfo) => l.id === parseInt(logId!));
      if (log) {
        setLogInfo(log);
      }
    } catch (err) {
      console.error('Error fetching log info:', err);
    }
  };

  useEffect(() => {
    if (logId) {
      fetchTranscript();
      fetchLogInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);


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

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCallDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadTranscript = () => {
    if (!normalizedTranscripts || normalizedTranscripts.length === 0 || !logInfo) return;

    const content = `Call Transcript - ID: ${logId}
Date: ${formatDateTime(logInfo.start_time)}
Duration: ${getCallDuration(logInfo.start_time, logInfo.end_time)}
From: ${formatPhoneNumber(logInfo.from_phone, 'from')}
To: ${formatPhoneNumber(logInfo.to_phone, 'to')}

Transcript:
${normalizedTranscripts.map(t => {
  const speaker = t.user === 'assistant' || t.user === 'agent' ? 'Assistant' : 'Patient';
  return `${speaker}: ${t.text}`;
}).join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${logId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007C91] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/logs')}
            className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
          >
            Back to Logs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/logs')}
            className="flex items-center text-[#007C91] hover:text-[#005a6b] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Logs
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Transcript</h1>
              <p className="text-gray-600">Call ID: #{logId}</p>
            </div>
            
            <button
              onClick={downloadTranscript}
              className="flex items-center px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* Call Info */}
        {logInfo && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-medium">{formatPhoneNumber(logInfo.from_phone, 'from')}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-medium">{formatPhoneNumber(logInfo.to_phone, 'to')}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="font-medium">{formatDateTime(logInfo.start_time)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{getCallDuration(logInfo.start_time, logInfo.end_time)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Conversation Transcript
            </h2>
          </div>
          
          <div className="p-6">
            {normalizedTranscripts && normalizedTranscripts.length > 0 ? (
              <div className="space-y-6">
                {normalizedTranscripts.map((transcript) => {
                  const isAssistant = transcript.user === 'assistant' || transcript.user === 'agent';
                  const isAgentAction = transcript.user === 'agent-action';
                  
                  if (isAgentAction) {
                    return (
                      <div key={transcript.id} className="flex justify-center">
                        <div className="bg-gray-100 px-4 py-2 rounded-full">
                          <span className="text-xs text-gray-600 italic">{transcript.text}</span>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={transcript.id} className="flex">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                        isAssistant
                          ? 'bg-[#007C91] text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
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
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900 whitespace-pre-wrap">{transcript.text}</p>
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
  );
} 