import { useState, useEffect, useRef } from 'react';
import { FaClock, FaChevronDown } from 'react-icons/fa';

interface TimePickerProps {
  value?: string; // Format: "HH:MM AM/PM"
  onChange?: (time: string) => void;
  className?: string;
  label?: string;
}

export default function TimePicker({ 
  value = '08:00 AM', 
  onChange, 
  className = '',
  label = ''
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [displayTime, setDisplayTime] = useState('08:00 AM');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [time, ampm] = value.split(' ');
      const [hour, minute] = time.split(':').map(Number);
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod((ampm as 'AM' | 'PM') || 'AM');
      setDisplayTime(value);
    }
  }, [value]);

  // Generate hour options (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minute options (0-59 for complete minute selection)
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  const handleTimeChange = (hour: number, minute: number, period: 'AM' | 'PM') => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedPeriod(period);
    
    const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    setDisplayTime(formattedTime);
    
    if (onChange) {
      onChange(formattedTime);
    }
  };

  const handleHourChange = (hour: number) => {
    handleTimeChange(hour, selectedMinute, selectedPeriod);
  };

  const handleMinuteChange = (minute: number) => {
    handleTimeChange(selectedHour, minute, selectedPeriod);
  };

  const handlePeriodChange = (period: 'AM' | 'PM') => {
    handleTimeChange(selectedHour, selectedMinute, period);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Display Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md hover:border-[#007C91] hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-[#007C91] focus:border-[#007C91] transition-all duration-200 min-w-[100px] group"
      >
        <FaClock className="text-[#007C91] text-xs group-hover:text-[#098289] transition-colors" />
        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{displayTime}</span>
        <FaChevronDown className={`text-gray-400 text-xs transition-all duration-200 ${isOpen ? 'rotate-180 text-[#007C91]' : 'group-hover:text-gray-600'}`} />
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex gap-3">
            {/* Hours Column */}
            <div className="flex flex-col">
              <div className="text-xs font-semibold text-gray-600 mb-2 text-center uppercase tracking-wide">Hour</div>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleHourChange(hour)}
                    className={`w-10 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      selectedHour === hour
                        ? 'bg-[#007C91] text-white font-semibold shadow-sm transform scale-105'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex flex-col">
              <div className="text-xs font-semibold text-gray-600 mb-2 text-center uppercase tracking-wide">Min</div>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleMinuteChange(minute)}
                    className={`w-10 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      selectedMinute === minute
                        ? 'bg-[#007C91] text-white font-semibold shadow-sm transform scale-105'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM Column */}
            <div className="flex flex-col">
              <div className="text-xs font-semibold text-gray-600 mb-2 text-center uppercase tracking-wide">Period</div>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {periods.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodChange(period)}
                    className={`w-10 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      selectedPeriod === period
                        ? 'bg-[#007C91] text-white font-semibold shadow-sm transform scale-105'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Done Button */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 bg-[#007C91] text-white text-xs font-medium rounded-md hover:bg-[#098289] transition-colors duration-150"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
