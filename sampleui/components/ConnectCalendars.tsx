import { FaGoogle, FaMicrosoft, FaCalendarAlt } from "react-icons/fa";

interface ConnectCalendarsProps {
  doctorId: number;
  onConnect?: (provider: 'google' | 'outlook') => void;
  className?: string;
}

export default function ConnectCalendars({ doctorId, onConnect, className = "" }: ConnectCalendarsProps) {
  const connectGoogle = () => {
    if (onConnect) {
      onConnect('google');
    } else {
      window.location.href = `${import.meta.env.VITE_API_URL}/dashboard/calendar/connect/google/${doctorId}`;
    }
  };

  const connectOutlook = () => {
    if (onConnect) {
      onConnect('outlook');
    } else {
      window.location.href = `${import.meta.env.VITE_API_URL}/dashboard/calendar/connect/outlook/${doctorId}`;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <FaCalendarAlt className="text-[#007C91]" />
        <h3 className="text-lg font-semibold text-gray-900">Connect Your Calendars</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={connectGoogle}
          className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#007C91] hover:bg-[#DAECED] transition-all duration-200 group"
        >
          <FaGoogle className="text-[#007C91] text-xl" />
          <div className="text-left">
            <div className="font-medium text-gray-900 group-hover:text-[#03585D]">Google Calendar</div>
            <div className="text-sm text-gray-500">Sync with Google</div>
          </div>
        </button>

        <button
          onClick={connectOutlook}
          className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#098289] hover:bg-[#DAECED] transition-all duration-200 group"
        >
          <FaMicrosoft className="text-[#098289] text-xl" />
          <div className="text-left">
            <div className="font-medium text-gray-900 group-hover:text-[#03585D]">Outlook Calendar</div>
            <div className="text-sm text-gray-500">Sync with Outlook</div>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Connect your calendars to automatically sync appointments and manage your schedule.
      </p>
    </div>
  );
}
