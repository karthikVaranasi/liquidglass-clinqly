import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import TimePicker from '../../../components/TimePicker';
import axios from 'axios';
import axiosInstance from '../../../utils/axiosInstance';
import { useUserStore } from '../../../stores/useUserStore';
import type { DoctorData } from '../../../utils/types';

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const WorkingHours: React.FC = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { enabled: true, startTime: '08:00 AM', endTime: '06:00 PM' },
    tuesday: { enabled: true, startTime: '08:00 AM', endTime: '06:00 PM' },
    wednesday: { enabled: true, startTime: '08:00 AM', endTime: '06:00 PM' },
    thursday: { enabled: true, startTime: '08:00 AM', endTime: '06:00 PM' },
    friday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
    saturday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
    sunday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
  });

  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userData, userRole } = useUserStore();

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24Hour: string): string => {
    const [hours, minutes] = time24Hour.split(':');
    const hour24 = parseInt(hours);
    let hour12 = hour24;
    let period = 'AM';
    
    if (hour24 === 0) {
      hour12 = 12;
    } else if (hour24 === 12) {
      period = 'PM';
    } else if (hour24 > 12) {
      hour12 = hour24 - 12;
      period = 'PM';
    }
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12Hour: string): string => {
    const [time, period] = time12Hour.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  // Compute clinic ID from user data
  const clinicId = useMemo(() => {
    if (!userData || userRole !== 'doctor') {
      return null;
    }
    const doctor = userData as DoctorData;
    return doctor.clinic_id;
  }, [userData, userRole]);

  // Load working hours from API on component mount
  const loadWorkingHours = useCallback(async () => {
    if (!clinicId) {
      setErrorMessage('Clinic ID not found. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch working hours from API
      const response = await axiosInstance.get(
        `/dashboard/clinics/clinic-working-hours?clinic_id=${clinicId}`
      );

      const apiData = response.data;
      
      // Map API response to our component state
      const dayMapping: { [key: string]: keyof WorkingHours } = {
        'Mon': 'monday',
        'Tue': 'tuesday', 
        'Wed': 'wednesday',
        'Thu': 'thursday',
        'Fri': 'friday',
        'Sat': 'saturday',
        'Sun': 'sunday'
      };

      // Initialize with default values
      const newWorkingHours: WorkingHours = {
        monday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        tuesday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        wednesday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        thursday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        friday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        saturday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
        sunday: { enabled: false, startTime: '08:00 AM', endTime: '06:00 PM' },
      };

      // Update with API data
      if (apiData.working_hours && Array.isArray(apiData.working_hours)) {
        apiData.working_hours.forEach((dayData: { day_of_week: string; start_time: string; end_time: string; is_closed: boolean }) => {
          const dayKey = dayMapping[dayData.day_of_week];
          if (dayKey) {
            newWorkingHours[dayKey] = {
              enabled: !dayData.is_closed,
              startTime: convertTo12Hour(dayData.start_time),
              endTime: convertTo12Hour(dayData.end_time)
            };
          }
        });
      }

      setWorkingHours(newWorkingHours);
      
    } catch (error) {
      console.error('Error loading working hours from API:', error);
      
      // Show error message
      setErrorMessage('Failed to load working hours from server. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadWorkingHours();
  }, [loadWorkingHours]);

  const handleDayToggle = (day: keyof WorkingHours) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const handleTimeChange = (day: keyof WorkingHours, field: keyof DaySchedule, value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!clinicId) {
      setErrorMessage('Clinic ID not found. Please log in again.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSavedMessage(false);

    try {
      // Map day names to API format
      const dayMapping: { [key: string]: string } = {
        monday: 'Mon',
        tuesday: 'Tue',
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun'
      };

      // Transform working hours to API format
      const apiWorkingHours = Object.keys(workingHours).map((day) => {
        const dayKey = day as keyof WorkingHours;
        const schedule = workingHours[dayKey];
        
        return {
          day_of_week: dayMapping[day],
          start_time: convertTo24Hour(schedule.startTime),
          end_time: convertTo24Hour(schedule.endTime),
          is_closed: !schedule.enabled
        };
      });

      const requestBody = {
        clinic_id: clinicId,
        working_hours: apiWorkingHours
      };

      // Make API call
      await axiosInstance.put(
        `/dashboard/clinics/clinic-working-hours`,
        requestBody
      );
      
      // Show success message
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      
    } catch (error) {
      console.error('Error saving working hours:', error);
      let errorMsg = 'Failed to save working hours. Please try again.';
      
      if (axios.isAxiosError(error)) {
        errorMsg = error.response?.data?.detail || error.message;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const dayLabels: { [key in keyof WorkingHours]: string } = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {savedMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Working hours saved successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700 font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Working Hours Card */}
      <div className="bg-white rounded-lg shadow-sm p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 ">
          <Clock className="w-5 h-5 text-[#098289]" />
          <h2 className="text-lg font-semibold text-gray-800">Clinic Configuration</h2>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#098289]"></div>
              <span className="text-gray-600">Loading working hours...</span>
            </div>
          </div>
        )}

        {/* Days Schedule - Improved Layout */}
        {!isLoading && (
          <div className="space-y-1">
            {Object.keys(workingHours).map((day) => {
              const dayKey = day as keyof WorkingHours;
              const schedule = workingHours[dayKey];
              
              return (
                <div key={day} className="flex items-center py-2 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-medium text-gray-700 w-20 text-sm flex-shrink-0">{dayLabels[dayKey]}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {schedule.enabled ? (
                      <>
                        <div className="flex-shrink-0">
                          <TimePicker
                            value={schedule.startTime}
                            onChange={(time) => handleTimeChange(dayKey, 'startTime', time)}
                          />
                        </div>
                        <span className="text-gray-500 text-sm font-medium flex-shrink-0">to</span>
                        <div className="flex-shrink-0">
                          <TimePicker
                            value={schedule.endTime}
                            onChange={(time) => handleTimeChange(dayKey, 'endTime', time)}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">Closed</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDayToggle(dayKey)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 w-16 ml-2 ${
                      schedule.enabled 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {schedule.enabled ? 'Close' : 'Open'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Button */}
        {!isLoading && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 bg-[#098289] text-white rounded-lg hover:bg-[#07666d] transition-colors font-semibold text-sm ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Working Hours'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingHours;
