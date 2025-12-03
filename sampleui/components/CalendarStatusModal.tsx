import { useState, useEffect } from 'react';
import { FaTimes, FaGoogle, FaMicrosoft, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import axiosInstance from '../utils/axiosInstance';

interface CalendarStatus {
  connected: boolean;
  valid: boolean;
  email: string | null;
  connected_at: string | null;
  needs_reauth: boolean;
}

interface CalendarStatusData {
  doctor_id: number;
  google: CalendarStatus;
  outlook: CalendarStatus;
}

interface CalendarStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number;
  onConnect: (provider: 'google' | 'outlook') => void;
}

export default function CalendarStatusModal({ isOpen, onClose, doctorId, onConnect }: CalendarStatusModalProps) {
  const [status, setStatus] = useState<CalendarStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchCalendarStatus();
    }
  }, [isOpen, doctorId]);

  const fetchCalendarStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get<CalendarStatusData>(`/dashboard/calendar/status/${doctorId}`);
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: 'google' | 'outlook') => {
    onConnect(provider);
    onClose();
  };

  const getStatusIcon = (providerStatus: CalendarStatus) => {
    if (providerStatus.connected && providerStatus.valid) {
      return <FaCheckCircle className="text-green-500" />;
    } else if (providerStatus.connected && providerStatus.needs_reauth) {
      return <FaExclamationTriangle className="text-yellow-500" />;
    } else {
      return <FaExclamationTriangle className="text-red-500" />;
    }
  };

  const getStatusText = (providerStatus: CalendarStatus) => {
    if (providerStatus.connected && providerStatus.valid) {
      return 'Connected & Active';
    } else if (providerStatus.connected && providerStatus.needs_reauth) {
      return 'Needs Re-authentication';
    } else if (providerStatus.connected) {
      return 'Connected but Invalid';
    } else {
      return 'Not Connected';
    }
  };

  const getStatusColor = (providerStatus: CalendarStatus) => {
    if (providerStatus.connected && providerStatus.valid) {
      return 'text-green-600';
    } else if (providerStatus.connected && providerStatus.needs_reauth) {
      return 'text-yellow-600';
    } else if (providerStatus.connected) {
      return 'text-red-600';
    } else {
      return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Calendar Connection Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-[#007C91] text-2xl" />
              <span className="ml-2 text-gray-600">Loading status...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <FaExclamationTriangle className="text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status && !loading && (
            <div className="space-y-4">
              {/* Google Calendar Status */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FaGoogle className="text-[#007C91] mr-2" />
                    <span className="font-medium">Google Calendar</span>
                  </div>
                  {getStatusIcon(status.google)}
                </div>
                <p className={`text-sm ${getStatusColor(status.google)}`}>
                  {getStatusText(status.google)}
                </p>
                {status.google.email && (
                  <p className="text-xs text-gray-500 mt-1">{status.google.email}</p>
                )}
                {status.google.connected_at && (
                  <p className="text-xs text-gray-500">
                    Connected: {new Date(status.google.connected_at).toLocaleDateString()}
                  </p>
                )}
                {(!status.google.connected || status.google.needs_reauth) && (
                  <button
                    onClick={() => handleConnect('google')}
                    className="mt-2 bg-[#007C91] hover:bg-[#03585D] text-white px-4 py-1.5 rounded-full text-sm transition-colors"
                  >
                    {status.google.connected ? 'Reconnect' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Outlook Calendar Status */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FaMicrosoft className="text-[#098289] mr-2" />
                    <span className="font-medium">Outlook Calendar</span>
                  </div>
                  {getStatusIcon(status.outlook)}
                </div>
                <p className={`text-sm ${getStatusColor(status.outlook)}`}>
                  {getStatusText(status.outlook)}
                </p>
                {status.outlook.email && (
                  <p className="text-xs text-gray-500 mt-1">{status.outlook.email}</p>
                )}
                {status.outlook.connected_at && (
                  <p className="text-xs text-gray-500">
                    Connected: {new Date(status.outlook.connected_at).toLocaleDateString()}
                  </p>
                )}
                {(!status.outlook.connected || status.outlook.needs_reauth) && (
                  <button
                    onClick={() => handleConnect('outlook')}
                    className="mt-2 bg-[#098289] hover:bg-[#03585D] text-white px-4 py-1.5 rounded-full text-sm transition-colors"
                  >
                    {status.outlook.connected ? 'Reconnect' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
                <p className="text-sm text-gray-600">
                  {status.google.connected && status.google.valid && status.outlook.connected && status.outlook.valid
                    ? 'Both calendars are connected and active.'
                    : status.google.connected && status.google.valid
                    ? 'Only Google Calendar is connected.'
                    : status.outlook.connected && status.outlook.valid
                    ? 'Only Outlook Calendar is connected.'
                    : 'No calendars are connected. Please connect at least one calendar to sync your appointments.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
