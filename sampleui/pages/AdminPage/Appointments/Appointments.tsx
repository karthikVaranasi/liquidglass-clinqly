import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FaCalendarAlt } from 'react-icons/fa';

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

const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekStart, setWeekStart] = useState(dayjs().tz(EST_TIMEZONE).startOf("week").add(1, "day")); // Monday in EST
  const [view, setView] = useState<'all' | 'yesterday' | 'today' | 'tomorrow' | 'week'>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [providers, setProviders] = useState<string[]>([]);
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search')?.toLowerCase() || '';

  useEffect(() => {
    if (location.state && location.state.initialFilter) {
      setView(location.state.initialFilter);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch all appointments (admin can see all)
        const response = await axiosInstance.get<{ appointments: Appointment[] }>(
          `/dashboard/appointments`
        );
        
        setAppointments(response.data.appointments);
        
        // Extract unique providers
        const uniqueProviders = Array.from(
          new Set(response.data.appointments.map(appt => appt.doctor_name).filter(Boolean))
        ).sort();
        setProviders(uniqueProviders);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
        setError('Failed to load appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

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

  const filteredAppointments = getFilteredAppointments()
    .filter((appt) => {
      // Provider filter
      if (selectedProvider !== 'all' && appt.doctor_name !== selectedProvider) {
        return false;
      }
      // Search filter
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
    <div className="w-full h-fit pt-[70px] bg-[#F4F8FB] flex justify-center">
      <div className="w-full max-w-[1400px] py-6 mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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

          {/* Provider Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="provider-filter" className="text-sm font-medium text-gray-700">
              Filter by Provider:
            </label>
            <select
              id="provider-filter"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#098289] focus:border-transparent"
            >
              <option value="all">All Providers</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
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
                    <th className="py-3 px-6">Name</th>
                    {view === 'week' && <th className="py-3 px-8">Date</th>}
                    <th className="py-3 px-8">Time</th>
                    <th className="py-3 px-10">Provider</th>
                    <th className="py-3 px-7">Status</th>
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
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={view === 'week' ? 5 : 4} className="py-8 text-gray-400 text-center">
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

export default AppointmentsPage;