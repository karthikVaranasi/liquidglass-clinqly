import { useState, useEffect } from 'react';
import { calendarService, type CalendarStatus } from '../services/calendarService';

interface CalendarStatusButtonsProps {
  doctorId: number;
}

const CalendarStatusButtons = ({ doctorId }: CalendarStatusButtonsProps) => {
  const [googleStatus, setGoogleStatus] = useState<CalendarStatus | null>(null);
  const [microsoftStatus, setMicrosoftStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const [google, microsoft] = await Promise.all([
          calendarService.getGoogleStatus(doctorId),
          calendarService.getMicrosoftStatus(doctorId)
        ]);
        setGoogleStatus(google);
        setMicrosoftStatus(microsoft);
      } catch (error) {
        console.error('Error fetching calendar status:', error);
        setGoogleStatus({ connected: false, provider: 'google', email: null, expires_at: null, message: 'Error' });
        setMicrosoftStatus({ connected: false, provider: 'microsoft', email: null, expires_at: null, message: 'Error' });
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchStatus();
    }
  }, [doctorId]);

  const handleGoogleConnect = () => {
    calendarService.connectGoogle(doctorId);
  };

  const handleMicrosoftConnect = () => {
    calendarService.connectMicrosoft(doctorId);
  };

  // Only show buttons for providers that are not connected
  const showGoogle = !googleStatus?.connected;
  const showMicrosoft = !microsoftStatus?.connected;

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  // Don't show anything if both are connected
  if (!showGoogle && !showMicrosoft) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
        <button
          onClick={googleStatus?.connected ? undefined : handleGoogleConnect}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#DAECED] text-[#007C91] hover:bg-[#B8E5E7] transition-colors"
        >
          {googleStatus?.connected ? 'Connected to Google' : 'Connect Google'}
        </button>
        <button
          onClick={microsoftStatus?.connected ? undefined : handleMicrosoftConnect}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#DAECED] text-[#007C91] hover:bg-[#B8E5E7] transition-colors"
        >
          {microsoftStatus?.connected ? 'Connected to Microsoft' : 'Connect Microsoft'}
        </button>
    </div>
  );
};

export default CalendarStatusButtons;
