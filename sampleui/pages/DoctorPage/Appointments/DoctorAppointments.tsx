import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FaCalendarAlt, FaBell } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useUserStore } from '../../../stores/useUserStore';
import type { DoctorData } from '../../../utils/types';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Configure EST timezone
const EST_TIMEZONE = 'America/New_York';

interface Appointment {
  id: number;
  appointment_time: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  status: string;
  duration: number;
  calendar_event_id: string;
}

const DoctorAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekStart, setWeekStart] = useState(dayjs().tz(EST_TIMEZONE).startOf("week").add(1, "day")); // Monday in EST
  const [view, setView] = useState<'all' | 'yesterday' | 'today' | 'tomorrow' | 'week'>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search')?.toLowerCase() || '';
  const { userData, userRole } = useUserStore();

  // Compute appointments URL based on user role
  const appointmentsUrl = useMemo(() => {
    if (!userData || userRole !== 'doctor') return null;
    
    const doctorData = userData as DoctorData;
    if (!doctorData.id || !doctorData.clinic_id) return null;
    
    return `/dashboard/appointments?clinic_id=${doctorData.clinic_id}&doctor_id=${doctorData.id}`;
  }, [userData, userRole]);

  useEffect(() => {
    if (location.state && location.state.initialFilter) {
      setView(location.state.initialFilter);
    }
  }, [location.state]);

  // Fetch appointments function
  const fetchDoctorAppointments = useCallback(async () => {
    if (!appointmentsUrl) {
      setError('Doctor data not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axiosInstance.get<{ appointments: Appointment[] }>(appointmentsUrl);
      setAppointments(response.data.appointments);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appointmentsUrl]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  const handleSendReminder = async (appointmentId: number) => {
    try {
      setSendingReminder(appointmentId);
      const response = await axiosInstance.post(
        `/dashboard/reminders/send/appointment/${appointmentId}`
      );
      
      if (response.data.status === 'success') {
        toast.success('Reminder sent successfully', {
          style: {
            background: '#FFFFFF',
            color: '#111827',
            border: '1px solid #E5E7EB',
          },
        });
      }
      else {
        toast.error('Failed to send reminder. Please try again.', {
          style: {
            background: '#FFFFFF',
            color: '#111827',
            border: '1px solid #E5E7EB',
          },
        });
      }
    } catch (err) {
      console.error('Failed to send reminder:', err);
      setError('Failed to send reminder. Please try again.');
      toast.error('Failed to send reminder. Please try again.', {
        style: {
          background: '#FFFFFF',
          color: '#111827',
          border: '1px solid #E5E7EB',
        },
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getFilteredAppointments = () => {
    const now = dayjs().tz(EST_TIMEZONE);
    
    switch (view) {
      case 'all':
        return appointments;
      case 'yesterday':
        return appointments.filter(
          (appt) => {
            const apptDate = dayjs(appt.appointment_time);
            return apptDate.isValid() && apptDate.format("YYYY-MM-DD") === now.subtract(1, 'day').format("YYYY-MM-DD");
          }
        );
      case 'today':
        return appointments.filter(
          (appt) => {
            const apptDate = dayjs(appt.appointment_time);
            return apptDate.isValid() && apptDate.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
          }
        );
      case 'tomorrow':
        return appointments.filter(
          (appt) => {
            const apptDate = dayjs(appt.appointment_time);
            return apptDate.isValid() && apptDate.format("YYYY-MM-DD") === now.add(1, 'day').format("YYYY-MM-DD");
          }
        );
      case 'week':
        return appointments.filter(
          (appt) => {
            const apptDate = dayjs(appt.appointment_time);
            return apptDate.isValid() && apptDate.isAfter(weekStart.subtract(1, 'day')) && apptDate.isBefore(weekStart.add(7, 'day'));
          }
        );
      default:
        return appointments;
    }
  };

  const filteredAppointments = getFilteredAppointments().filter((appt) => {
    if (!searchQuery) return true;
    return (
      (appt.patient_name && appt.patient_name.toLowerCase().includes(searchQuery)) ||
      (appt.doctor_name && appt.doctor_name.toLowerCase().includes(searchQuery)) ||
      (appt.status && appt.status.toLowerCase().includes(searchQuery))
    );
  });

  const goToNextWeek = () => setWeekStart(weekStart.add(7, "day"));
  const goToPrevWeek = () => setWeekStart(weekStart.subtract(7, "day"));

  return (
    <div className="w-full h-fit pt-[70px] bg-[#F4F8FB] flex justify-center page-content-with-topbar">
      <div className="w-full max-w-[1400px] py-6 mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#098289] text-lg" />
            <h1 className="text-2xl font-bold text-[#0D1A12] font-sf">
              Appointments
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {(['all', 'yesterday', 'today', 'tomorrow', 'week'] as Array<'all' | 'yesterday' | 'today' | 'tomorrow' | 'week'>).map((type) => (
              <button
                key={type}
                onClick={() => setView(type)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all border ${
                  view === type
                    ? 'bg-[#098289] text-white border-[#098289]' 
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#098289]"></div>
            <span className="ml-2 text-gray-600">Loading appointments...</span>
          </div>
        )}

        {/* Content - only show when not loading */}
        {!loading && (
          <>
            {/* Week Navigation (only show for week view) */}
            {view === 'week' && (
              <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={goToPrevWeek}
                    className="bg-[#F4F4F4] rounded-full p-1 hover:bg-gray-200 transition text-xs"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600">
                    {weekStart.format('MMM D')} - {weekStart.add(6, 'day').format('MMM D, YYYY')}
                  </span>
                  <button 
                    onClick={goToNextWeek}
                    className="bg-[#F4F4F4] rounded-full p-1 hover:bg-gray-200 transition text-xs"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm mt-2">
              <table className="w-full table-auto text-sm">
                <thead className="bg-[#F4F8FB] h-[46px] rounded-[10px]">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-6 font-bold">Patient Name</th>
                    {view === 'week' && <th className="py-3 px-8 font-bold">Date</th>}
                    <th className="py-3 px-8 font-bold">Time</th>
                    <th className="py-3 px-10 font-bold">Assigned To</th>
                    <th className="py-3 px-7 font-bold">Status</th>
                    <th className="py-3 px-4 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments
                      .sort((a, b) => {
                        const timeA = dayjs(a.appointment_time).tz(EST_TIMEZONE);
                        const timeB = dayjs(b.appointment_time).tz(EST_TIMEZONE);
                        const now = dayjs().tz(EST_TIMEZONE);
                        
                        // If both dates are valid, compare them
                        if (timeA.isValid() && timeB.isValid()) {
                          // Check if appointments are upcoming (after current time) or past
                          const aIsUpcoming = timeA.isAfter(now);
                          const bIsUpcoming = timeB.isAfter(now);
                          
                          // Priority order: Upcoming appointments first, then past appointments
                          if (aIsUpcoming && !bIsUpcoming) return -1; // Upcoming before past
                          if (!aIsUpcoming && bIsUpcoming) return 1; // Past after upcoming
                          
                          // Within same category, sort by time
                          if (aIsUpcoming && bIsUpcoming) {
                            return timeA.diff(timeB); // Upcoming: earliest first
                          } else {
                            return timeB.diff(timeA); // Past: most recent first
                          }
                        }
                        
                        // If only one is valid, put valid ones first
                        if (timeA.isValid() && !timeB.isValid()) return -1;
                        if (!timeA.isValid() && timeB.isValid()) return 1;
                        
                        // If neither is valid, maintain original order
                        return 0;
                      })
                      .map((appt) => {
                        // Clean the patient name by replacing {{}} placeholders with spaces
                        const cleanPatientName = (appt.patient_name || '').replace(/\{\{.*?\}\}/g, ' ').trim();
                        // Determine if appointment is in the future (upcoming) using EST timezone
                        const apptTimeEst = dayjs(appt.appointment_time).tz(EST_TIMEZONE);
                        const nowEst = dayjs().tz(EST_TIMEZONE);
                        const isUpcoming = apptTimeEst.isValid() && apptTimeEst.isAfter(nowEst);
                        return (
                          <tr key={appt.id} className="border-t border-[#E5E7EB] hover:bg-[#F4F8FB] transition">
                            <td className="py-2 px-4 flex items-center gap-2 min-w-[200px]">
                              <span className="font-medium text-gray-900 max-w-[200px]">{cleanPatientName || 'Unnamed'}</span>
                            </td>
                            {view === 'week' && (
                              <td className="py-2 px-4 whitespace-nowrap">
                                {(() => {
                                  const parsedTime = dayjs(appt.appointment_time);
                                  if (parsedTime.isValid()) {
                                    return parsedTime.format('MMM D, YYYY');
                                  } else {
                                    return 'N/A';
                                  }
                                })()}
                              </td>
                            )}
                            <td className="py-2 px-4 whitespace-nowrap">
                              {(() => {
                                // Parse the appointment time from ISO format "YYYY-MM-DDTHH:mm:ss"
                                const parsedTime = dayjs(appt.appointment_time);
                                if (parsedTime.isValid()) {
                                  return parsedTime.format('MMM D h:mm A');
                                } else {
                                  // Fallback to original if parsing fails
                                  return appt.appointment_time || 'N/A';
                                }
                              })()}
                            </td>
                            <td className="py-2 px-4 whitespace-nowrap">{appt.doctor_name}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                appt.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : appt.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center">
                              {appt.status === 'scheduled' && isUpcoming ? (
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleSendReminder(appt.id)}
                                    disabled={sendingReminder === appt.id}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                      sendingReminder === appt.id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                  >
                                    <FaBell className="text-xs" />
                                    {sendingReminder === appt.id ? 'Sending...' : 'Remind'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    -
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={view === 'week' ? 6 : 5} className="py-8 text-gray-400 text-center">
                        <div className="flex justify-center w-full">
                          No appointments found for this search or filter.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointments;