import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FaCalendarAlt, FaCalendarPlus, FaTimes, FaIdCard, FaFileMedical, FaDownload } from 'react-icons/fa';
import leftarrow from '../../../assets/LeftArrow.svg';
import type { Patient, Appointment, APIAppointment, PatientDocuments, DoctorData } from '../../../utils/types';
import axiosInstance from '../../../utils/axiosInstance';
import { useUserStore } from '../../../stores/useUserStore';

const PatientProfilePanel: React.FC<{
  patient: Patient;
  onClose: () => void;
}> = ({ patient, onClose }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientDetails, setPatientDetails] = useState<Patient>(patient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<PatientDocuments | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({
    isOpen: false,
    appointment: null
  });
  
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({
    isOpen: false,
    appointment: null
  });

  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false
  });
  
  // Reschedule form fields
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Schedule form fields
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAvailableSlots, setScheduleAvailableSlots] = useState<string[]>([]);
  const [loadingScheduleSlots, setLoadingScheduleSlots] = useState(false);

  // Get user data from Zustand store
  const { userData, userRole } = useUserStore();

  // Helper function to transform API appointment data to component format
  const transformAppointmentData = (apiAppointment: APIAppointment): Appointment => {
    // Parse appointment_time to get date and time
    const appointmentDateTime = new Date(apiAppointment.appointment_time);
    const date = appointmentDateTime.toISOString().split('T')[0]; // "2025-11-04"
    const time = appointmentDateTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }); // "8:30 AM"

    return {
      appointment_id: apiAppointment.id,
      patient_id: apiAppointment.patient_id,
      doctor_id: apiAppointment.doctor_id,
      doctor_name: apiAppointment.doctor_name || 'N/A',
      department: apiAppointment.department || 'N/A',
      Sdate: date,
      Stime: time,
      status: apiAppointment.status,
      duration_minutes: apiAppointment.duration || apiAppointment.duration_minutes || 30,
      calendar_event_id: apiAppointment.calendar_event_id
    };
  };

  // Fetch data on component mount and whenever patient changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userData || userRole !== 'doctor') {
          return;
        }

        const doctor = userData as DoctorData;

        const appointmentsRes = await axiosInstance.get(
          `/dashboard/appointments/patient/${patient.id}`
        );
        const rawAppts = appointmentsRes.data.appointments || [];
        // Transform appointments to expected format
        const appts = rawAppts.map(transformAppointmentData);
        setAppointments(appts);

        // Fetch patients with clinic_id only
        const patientsRes = await axiosInstance.get(
          `/dashboard/patients?clinic_id=${doctor.clinic_id}`
        );
        const found = patientsRes.data.patients.find((p: Patient) => p.id === patient.id);
        if (found) setPatientDetails(found);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [patient.id, userData, userRole]);

  // Fetch patient documents
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const response = await axiosInstance.get(
          `/dashboard/patients/documents/${patient.id}`
        );
        setDocuments(response.data);
      } catch (error) {
        console.error('Error fetching documents:', error);
        // Don't set error state if documents don't exist (404 is expected)
        if ((error as { response?: { status?: number } })?.response?.status !== 404) {
          console.error('Error fetching patient documents:', error);
        }
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [patient.id]);

  // Close the sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours] = time.split(':');
    const [, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // Helper function to check if appointment is in the past
  const isAppointmentPast = (appointment: Appointment): boolean => {
    // If status is cancelled (check both spellings and case variations), it should go to past appointments
    if (appointment.status?.toLowerCase() === 'cancelled' || appointment.status?.toLowerCase() === 'canceled') {
      console.log('Cancelled appointment found:', appointment);
      return true;
    }
    
    const time24h = convertTo24Hour(appointment.Stime);
    const appointmentDateTime = new Date(`${appointment.Sdate}T${time24h}`);
    const now = new Date();
    
    // If appointment date/time is in the past, it should go to past appointments
    return appointmentDateTime < now;
  };

  // Helper function to check if appointment is upcoming
  const isAppointmentUpcoming = (appointment: Appointment): boolean => {
    // If status is cancelled (check both spellings and case variations), it should not be in upcoming
    if (appointment.status?.toLowerCase() === 'cancelled' || appointment.status?.toLowerCase() === 'canceled') {
      return false;
    }
    
    const time24h = convertTo24Hour(appointment.Stime);
    const appointmentDateTime = new Date(`${appointment.Sdate}T${time24h}`);
    const now = new Date();
    
    // If appointment date/time is in the future, it should be in upcoming
    return appointmentDateTime >= now;
  };

  const past = appointments.filter(isAppointmentPast);
  const upcoming = appointments.filter(isAppointmentUpcoming);
  
  // Debug logging
  console.log('Appointments data:', appointments);
  console.log('Past appointments:', past);
  console.log('Upcoming appointments:', upcoming);
  
  // Debug cancelled appointments specifically
  const cancelledAppointments = appointments.filter(apt => 
    apt.status?.toLowerCase() === 'cancelled' || apt.status?.toLowerCase() === 'canceled'
  );
  console.log('Cancelled appointments:', cancelledAppointments);
  console.log('Cancelled appointments in past:', cancelledAppointments.filter(isAppointmentPast));

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // Open reschedule modal
  const openRescheduleModal = (appointment: Appointment) => {
    setRescheduleModal({ isOpen: true, appointment });
    setRescheduleDate(appointment.Sdate);
    setRescheduleTime(appointment.Stime);
  };

  // Close reschedule modal
  const closeRescheduleModal = () => {
    setRescheduleModal({ isOpen: false, appointment: null });
    setRescheduleDate('');
    setRescheduleTime('');
    setAvailableSlots([]);
  };

  // Open cancel modal
  const openCancelModal = (appointment: Appointment) => {
    setCancelModal({ isOpen: true, appointment });
  };

  // Close cancel modal
  const closeCancelModal = () => {
    setCancelModal({ isOpen: false, appointment: null });
  };

  // Open schedule modal
  const openScheduleModal = () => {
    setScheduleModal({ isOpen: true });
    setScheduleDate('');
    setScheduleTime('');
    setScheduleAvailableSlots([]);
  };

  // Close schedule modal
  const closeScheduleModal = () => {
    setScheduleModal({ isOpen: false });
    setScheduleDate('');
    setScheduleTime('');
    setScheduleAvailableSlots([]);
  };

  // Fetch available time slots for reschedule
  const fetchAvailableSlots = useCallback(async (selectedDate: string) => {
    if (!selectedDate) return;
    
    if (!userData || userRole !== 'doctor') {
      setError('Doctor data not found');
      return;
    }

    const doctor = userData as DoctorData;
    
    setLoadingSlots(true);
    try {
      const response = await axiosInstance.post(
        '/dashboard/doctors/availability', 
        {
          clinic_id: doctor.clinic_id,
          doctor_id: doctor.id,
          start_date: selectedDate,
          end_date: selectedDate
        }
      );

      // Extract slots from dates_with_slots object
      if (response.data.dates_with_slots && response.data.dates_with_slots[selectedDate]) {
        setAvailableSlots(response.data.dates_with_slots[selectedDate]);
      } else if (response.data.available_slots && Array.isArray(response.data.available_slots)) {
        // Fallback for old API format
        setAvailableSlots(response.data.available_slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [userData, userRole]);

  // Fetch available time slots for schedule
  const fetchScheduleAvailableSlots = useCallback(async (selectedDate: string) => {
    if (!selectedDate) return;
    
    if (!userData || userRole !== 'doctor') {
      setError('Doctor data not found');
      return;
    }

    const doctor = userData as DoctorData;
    
    setLoadingScheduleSlots(true);
    try {
      const response = await axiosInstance.post(
        '/dashboard/doctors/availability', 
        {
          clinic_id: doctor.clinic_id,
          doctor_id: doctor.id,
          start_date: selectedDate,
          end_date: selectedDate
        }
      );

      // Extract slots from dates_with_slots object
      if (response.data.dates_with_slots && response.data.dates_with_slots[selectedDate]) {
        setScheduleAvailableSlots(response.data.dates_with_slots[selectedDate]);
      } else if (response.data.available_slots && Array.isArray(response.data.available_slots)) {
        // Fallback for old API format
        setScheduleAvailableSlots(response.data.available_slots);
      } else {
        setScheduleAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setScheduleAvailableSlots([]);
    } finally {
      setLoadingScheduleSlots(false);
    }
  }, [userData, userRole]);

  // Handle schedule form submission
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Schedule form submitted');
    
    if (!scheduleDate || !scheduleTime) {
      setError('Please select both date and time');
      return;
    }

    if (!userData || userRole !== 'doctor') {
      setError('Doctor data not found');
      return;
    }

    const doctor = userData as DoctorData;

    setLoading(true);
    setError('');

    try {
      const scheduleData = {
        clinic_id: doctor.clinic_id || 1,
        doctor_id: doctor.id,
        date: scheduleDate,
        time: scheduleTime,
        patient_id: patient.id,
        phone: patientDetails.phone_number || ""
      };

      console.log('Sending schedule request:', scheduleData);
      const response = await axiosInstance.post(
        '/dashboard/appointments/book', 
        scheduleData
      );
      console.log('Schedule response:', response.data);
      showToast('Appointment scheduled successfully!');
      
      // Refresh appointments
      const res = await axiosInstance.get(
        `/dashboard/appointments/patient/${patient.id}`
      );
      const rawAppts = res.data.appointments || [];
      const appts = rawAppts.map(transformAppointmentData);
      setAppointments(appts);
      
      closeScheduleModal();
    } catch (err: unknown) {
      console.error('Error scheduling appointment:', err);
      const error = err as { response?: { data?: { message?: string; error?: string; errors?: Array<{ field: string; message: string }> } } };
      
      let errorMessage = 'Failed to schedule appointment';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle validation errors
        errorMessage = error.response.data.errors.map((e: { field: string; message: string }) => e.message).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle reschedule form submission
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Reschedule form submitted');
    
    if (!rescheduleModal.appointment) {
      setError('No appointment selected');
      return;
    }

    if (!rescheduleDate || !rescheduleTime) {
      setError('Please select both date and time');
      return;
    }

    if (!userData || userRole !== 'doctor') {
      setError('Doctor data not found');
      return;
    }

    const doctor = userData as DoctorData;

    setLoading(true);
    setError('');

    try {
      const rescheduleData = {
        appointment_id: rescheduleModal.appointment.appointment_id,
        clinic_id: doctor.clinic_id || 1,
        doctor_id: doctor.id,
        date: rescheduleDate,
        time: rescheduleTime,
        patient_id: patient.id,
        phone: patientDetails.phone_number || ""
      };

      console.log('Sending reschedule request:', rescheduleData);
      const response = await axiosInstance.post(
        '/dashboard/appointments/reschedule', 
        rescheduleData
      );
      console.log('Reschedule response:', response.data);
      showToast('Appointment rescheduled successfully!');
      
      // Refresh appointments
      const res = await axiosInstance.get(
        `/dashboard/appointments/patient/${patient.id}`
      );
      const rawAppts = res.data.appointments || [];
      const appts = rawAppts.map(transformAppointmentData);
      setAppointments(appts);
      
      closeRescheduleModal();
    } catch (err: unknown) {
      console.error('Error rescheduling appointment:', err);
      const error = err as { response?: { data?: { message?: string; error?: string; errors?: Array<{ field: string; message: string }> } } };
      
      let errorMessage = 'Failed to reschedule appointment';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle validation errors
        errorMessage = error.response.data.errors.map((e: { field: string; message: string }) => e.message).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    console.log('Cancel appointment clicked');
    
    if (!cancelModal.appointment) {
      console.error('No appointment selected for cancellation');
      return;
    }

    if (!userData || userRole !== 'doctor') {
      setError('Doctor data not found');
      return;
    }

    const doctor = userData as DoctorData;

    setLoading(true);
    setError('');

    try {
      const cancelData = {
        clinic_id: doctor.clinic_id || 1,
        doctor_id: doctor.id,
        patient_id: patient.id,
        appointment_id: cancelModal.appointment.appointment_id,
        phone: patientDetails.phone_number || ""
      };

      console.log('Sending cancel request:', cancelData);
      await axiosInstance.post(
        '/dashboard/appointments/cancel', 
        cancelData
      );
      showToast('Appointment cancelled successfully!');
      
      // Refresh appointments
      const res = await axiosInstance.get(
        `/dashboard/appointments/patient/${patient.id}`
      );
      const rawAppts = res.data.appointments || [];
      const appts = rawAppts.map(transformAppointmentData);
      setAppointments(appts);
      
      closeCancelModal();
    } catch (err: unknown) {
      console.error('Error cancelling appointment:', err);
      const error = err as { response?: { data?: { message?: string; error?: string; errors?: Array<{ field: string; message: string }> } } };
      
      let errorMessage = 'Failed to cancel appointment';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle validation errors
        errorMessage = error.response.data.errors.map((e: { field: string; message: string }) => e.message).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (rescheduleDate && rescheduleModal.isOpen) {
      fetchAvailableSlots(rescheduleDate);
    }
  }, [rescheduleDate, rescheduleModal.isOpen, fetchAvailableSlots]);

  // Fetch available slots for schedule when date changes
  useEffect(() => {
    if (scheduleDate && scheduleModal.isOpen) {
      fetchScheduleAvailableSlots(scheduleDate);
    }
  }, [scheduleDate, scheduleModal.isOpen, fetchScheduleAvailableSlots]);


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50">
        <div
          ref={sidebarRef}
          className="bg-white w-[480px] h-[100vh] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out"
        >
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={leftarrow}
              alt="Close Sidebar"
              onClick={onClose}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            />
            <h2 className="text-xl font-bold text-gray-800">Patient Profile</h2>
          </div>
          <button
            onClick={() => {
              const profileContent = `Patient Profile - ${patientDetails.first_name} ${patientDetails.last_name}
Patient ID: ${patientDetails.id}

CONTACT INFORMATION
Phone Number: ${patientDetails.phone_number || 'Not provided'}
Date of Birth: ${patientDetails.dob ? new Date(patientDetails.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not provided'}

${patientDetails.guardians && patientDetails.guardians.length > 0 ? `GUARDIAN INFORMATION\n${patientDetails.guardians.map((g, i) => `${i + 1}. ${g.first_name} ${g.last_name}\n   DOB: ${new Date(g.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n   Relationship: ${g.relationship_to_patient}`).join('\n\n')}\n\n` : ''}UPCOMING APPOINTMENTS
${upcoming.length > 0 ? upcoming.map(a => `- ${new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - Status: ${a.status}`).join('\n') : 'No upcoming appointments'}

PAST APPOINTMENTS
${past.length > 0 ? past.map(a => `- ${new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - Status: ${a.status === 'cancelled' ? 'Cancelled' : 'Completed'}`).join('\n') : 'No past appointments'}

Generated on: ${new Date().toLocaleString('en-US')}`;

              const blob = new Blob([profileContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `patient-profile-${patientDetails.id}-${patientDetails.first_name}-${patientDetails.last_name}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#098289] text-white rounded-lg hover:bg-[#076d73] transition-colors text-sm font-medium"
          >
            <FaDownload size={14} />
            Download Profile
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Profile Header Card */}
          <div className="bg-gradient-to-br from-[#ECF5F6] to-[#F4F8FB] rounded-xl p-6 border border-[#098289]/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#098289] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {(() => {
                  const firstName = patientDetails.first_name || '';
                  const lastName = patientDetails.last_name || '';
                  if (firstName && lastName) {
                    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                  }
                  return (firstName || lastName).charAt(0).toUpperCase();
                })()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-sf text-gray-800 mb-1">
                  {`${patientDetails.first_name} ${patientDetails.last_name}`.trim()}
                </h3>
                <p className="text-sm text-gray-600">Patient ID:{patientDetails.id}</p>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h4 className="text-lg font-semibold text-[#098289] mb-4 pb-2 border-b border-gray-100">
              Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
                  <p className="text-sm font-medium text-gray-800">{patientDetails.phone_number || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-800">
                    {patientDetails.dob
                      ? `${new Date(patientDetails.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${new Date().getFullYear() - new Date(patientDetails.dob).getFullYear()} years old)`
                      : 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Information Card */}
          {patientDetails.guardians && patientDetails.guardians.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h4 className="text-lg font-semibold text-[#098289] mb-4 pb-2 border-b border-gray-100">
                Guardian Information
              </h4>
              {patientDetails.guardians.map((guardian, index) => (
                <div key={guardian.id} className={`space-y-3 ${index > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Guardian Name</p>
                      <p className="text-sm font-medium text-gray-800">
                        {`${guardian.first_name} ${guardian.last_name}`.trim()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Date of Birth</p>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(guardian.dob).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Relationship to Patient</p>
                      <p className="text-sm font-medium text-gray-800">{guardian.relationship_to_patient}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documents Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h4 className="text-lg font-semibold text-[#098289] mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <FaFileMedical className="text-[#098289]" />
              Documents
            </h4>
            {loadingDocuments ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm">Loading documents...</p>
              </div>
            ) : documents && (documents.id_document_url || documents.insurance_id_document_url) ? (
              <div className="space-y-4">
                {/* ID Document */}
                {documents.id_document_url && (
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FaIdCard className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">ID Document</p>
                          <p className="text-xs text-gray-500">Government-issued identification</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={documents.id_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#098289] text-white rounded-lg hover:bg-[#076d73] transition-colors text-sm font-medium"
                        >
                          View
                        </a>
                        <button
                          onClick={async () => {
                            setDownloadingDoc('id');
                            try {
                              // Helper function to get file extension from content type or URL
                              const getFileExtension = (contentType: string | null, url: string): string => {
                                if (contentType) {
                                  const mimeToExt: Record<string, string> = {
                                    'image/jpeg': 'jpg',
                                    'image/jpg': 'jpg',
                                    'image/png': 'png',
                                    'image/gif': 'gif',
                                    'image/webp': 'webp',
                                    'application/pdf': 'pdf',
                                    'application/msword': 'doc',
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                                  };
                                  
                                  const ext = mimeToExt[contentType.toLowerCase()];
                                  if (ext) return ext;
                                }
                                
                                // Fallback: try to get extension from URL
                                const urlExt = url.split('.').pop()?.split('?')[0].toLowerCase();
                                if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'].includes(urlExt)) {
                                  return urlExt === 'jpeg' ? 'jpg' : urlExt;
                                }
                                
                                // Default to pdf if we can't determine
                                return 'pdf';
                              };
                              
                              // Check if URL is absolute (external) or relative
                              const isExternalUrl = documents.id_document_url!.startsWith('http://') || documents.id_document_url!.startsWith('https://');
                              
                              let blob: Blob;
                              let contentType: string | null = null;
                              
                              if (isExternalUrl) {
                                // For external URLs, fetch as blob to force download
                                const response = await fetch(documents.id_document_url!, {
                                  method: 'GET',
                                  headers: {
                                    'Accept': '*/*'
                                  }
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to fetch document');
                                }
                                
                                contentType = response.headers.get('content-type');
                                blob = await response.blob();
                              } else {
                                // For relative URLs, use axios instance
                                const response = await axiosInstance.get(documents.id_document_url!, {
                                  responseType: 'blob'
                                });
                                contentType = response.headers['content-type'] || null;
                                blob = new Blob([response.data]);
                              }
                              
                              const extension = getFileExtension(contentType, documents.id_document_url!);
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `patient-${patientDetails.id}-id-document.${extension}`;
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Error downloading document:', error);
                              // Fallback: try direct download with download attribute
                              const urlExt = documents.id_document_url!.split('.').pop()?.split('?')[0].toLowerCase() || 'pdf';
                              const link = document.createElement('a');
                              link.href = documents.id_document_url!;
                              link.download = `patient-${patientDetails.id}-id-document.${urlExt}`;
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } finally {
                              setDownloadingDoc(null);
                            }
                          }}
                          disabled={downloadingDoc === 'id'}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaDownload size={12} />
                          {downloadingDoc === 'id' ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insurance Document */}
                {documents.insurance_id_document_url && (
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <FaFileMedical className="text-green-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Insurance Document</p>
                          <p className="text-xs text-gray-500">Insurance identification card</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={documents.insurance_id_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#098289] text-white rounded-lg hover:bg-[#076d73] transition-colors text-sm font-medium"
                        >
                          View
                        </a>
                        <button
                          onClick={async () => {
                            setDownloadingDoc('insurance');
                            try {
                              // Helper function to get file extension from content type or URL
                              const getFileExtension = (contentType: string | null, url: string): string => {
                                if (contentType) {
                                  const mimeToExt: Record<string, string> = {
                                    'image/jpeg': 'jpg',
                                    'image/jpg': 'jpg',
                                    'image/png': 'png',
                                    'image/gif': 'gif',
                                    'image/webp': 'webp',
                                    'application/pdf': 'pdf',
                                    'application/msword': 'doc',
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                                  };
                                  
                                  const ext = mimeToExt[contentType.toLowerCase()];
                                  if (ext) return ext;
                                }
                                
                                // Fallback: try to get extension from URL
                                const urlExt = url.split('.').pop()?.split('?')[0].toLowerCase();
                                if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'].includes(urlExt)) {
                                  return urlExt === 'jpeg' ? 'jpg' : urlExt;
                                }
                                
                                // Default to pdf if we can't determine
                                return 'pdf';
                              };
                              
                              // Check if URL is absolute (external) or relative
                              const isExternalUrl = documents.insurance_id_document_url!.startsWith('http://') || documents.insurance_id_document_url!.startsWith('https://');
                              
                              let blob: Blob;
                              let contentType: string | null = null;
                              
                              if (isExternalUrl) {
                                // For external URLs, fetch as blob to force download
                                const response = await fetch(documents.insurance_id_document_url!, {
                                  method: 'GET',
                                  headers: {
                                    'Accept': '*/*'
                                  }
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to fetch document');
                                }
                                
                                contentType = response.headers.get('content-type');
                                blob = await response.blob();
                              } else {
                                // For relative URLs, use axios instance
                                const response = await axiosInstance.get(documents.insurance_id_document_url!, {
                                  responseType: 'blob'
                                });
                                contentType = response.headers['content-type'] || null;
                                blob = new Blob([response.data]);
                              }
                              
                              const extension = getFileExtension(contentType, documents.insurance_id_document_url!);
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `patient-${patientDetails.id}-insurance-document.${extension}`;
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Error downloading document:', error);
                              // Fallback: try direct download with download attribute
                              const urlExt = documents.insurance_id_document_url!.split('.').pop()?.split('?')[0].toLowerCase() || 'pdf';
                              const link = document.createElement('a');
                              link.href = documents.insurance_id_document_url!;
                              link.download = `patient-${patientDetails.id}-insurance-document.${urlExt}`;
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } finally {
                              setDownloadingDoc(null);
                            }
                          }}
                          disabled={downloadingDoc === 'insurance'}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaDownload size={12} />
                          {downloadingDoc === 'insurance' ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaFileMedical className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-600 font-medium">No documents uploaded</p>
                <p className="text-sm text-gray-500 mt-1">This patient has not uploaded any documents yet.</p>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-lg font-semibold text-[#098289] flex items-center gap-2">
                <FaCalendarAlt className="text-[#098289]" />
                Upcoming Appointments {upcoming.length > 0 && `(${upcoming.length})`}
                <button
                  onClick={openScheduleModal}
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-[#098289] text-white rounded-lg hover:bg-[#076d73] transition-colors text-sm font-medium"
                >
                  <FaCalendarPlus size={14} />
                  Schedule
                </button>
              </h4>
            </div>
            {upcoming.length > 0 ? (
              <div className="p-5 space-y-3">
                {upcoming.map((a, i) => (
                  <div key={i} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaCalendarAlt className="text-green-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        a.status === 'scheduled' 
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : a.status === 'cancelled'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>
                        {a.status === 'scheduled' ? 'Scheduled' : 
                         a.status === 'cancelled' ? 'Cancelled' : 
                         a.status}
                      </span>
                    </div>
                    
                    {/* Action Buttons - Only show for scheduled appointments */}
                    {a.status === 'scheduled' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openRescheduleModal(a)}
                          disabled={loading}
                          className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          <FaCalendarPlus size={12} />
                          Reschedule
                        </button>
                        <button
                          onClick={() => openCancelModal(a)}
                          disabled={loading}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          <FaTimes size={12} />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCalendarAlt className="text-blue-400" size={24} />
                </div>
                <p className="text-gray-600 font-medium">No upcoming appointments</p>
                <p className="text-sm text-gray-500 mt-1">This patient has no scheduled appointments.</p>
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <FaCalendarAlt className="text-gray-500" />
                Past Appointments {past.length > 0 && `(${past.length})`}
              </h4>
            </div>
            {past.length > 0 ? (
              <div className="p-5 space-y-3">
                {past.map((a, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FaCalendarAlt className="text-gray-600" size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(`${a.Sdate}T${convertTo24Hour(a.Stime)}`).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })} • {a.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'cancelled'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                          {a.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCalendarAlt className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-600 font-medium">No past appointments</p>
                <p className="text-sm text-gray-500 mt-1">This patient has no appointment history.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Reschedule Appointment</h2>
              <button
                onClick={closeRescheduleModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                {loadingSlots ? (
                  <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-center">
                    Loading available times...
                  </div>
                ) : availableSlots && availableSlots.length > 0 ? (
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a time</option>
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                    No available times for this date
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeRescheduleModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !rescheduleDate || !rescheduleTime}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Cancel Appointment</h2>
              <button
                onClick={closeCancelModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to cancel this appointment?
              </p>
              {cancelModal.appointment && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Date:</strong> {new Date(`${cancelModal.appointment.Sdate}T${convertTo24Hour(cancelModal.appointment.Stime)}`).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Time:</strong> {new Date(`${cancelModal.appointment.Sdate}T${convertTo24Hour(cancelModal.appointment.Stime)}`).toLocaleTimeString()}
                  </p>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeCancelModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Schedule Appointment</h2>
              <button
                onClick={closeScheduleModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                {loadingScheduleSlots ? (
                  <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-center">
                    Loading available times...
                  </div>
                ) : scheduleAvailableSlots && scheduleAvailableSlots.length > 0 ? (
                  <select
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a time</option>
                    {scheduleAvailableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                    No available times for this date
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !scheduleDate || !scheduleTime}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientProfilePanel;
