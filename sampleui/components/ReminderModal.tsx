import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaCheck, FaSpinner, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { reminderService } from '../services/reminderService';
import type { UpcomingPatient, SelectiveReminderResponse } from '../services/reminderService';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number;
}

export default function ReminderModal({ isOpen, onClose, doctorId }: ReminderModalProps) {
  const [patients, setPatients] = useState<UpcomingPatient[]>([]);
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SelectiveReminderResponse | null>(null);

  const fetchUpcomingPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reminderService.getUpcomingPatients(doctorId);
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upcoming patients');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchUpcomingPatients();
    }
  }, [isOpen, doctorId, fetchUpcomingPatients]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSelectAppointment = (appointmentId: number) => {
    setSelectedAppointments(prev => 
      prev.includes(appointmentId)
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === patients.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(patients.map(p => p.appointment_id));
    }
  };

  const handleSendReminders = async () => {
    if (selectedAppointments.length === 0) {
      setError('Please select at least one patient to send reminders to');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await reminderService.sendReminders({
        patient_appointment_ids: selectedAppointments,
        doctor_id: doctorId
      });
      setSuccess(response);
      setSelectedAppointments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const formatAppointmentTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const getDaysUntilColor = (days: number) => {
    if (days === 0) return 'text-red-600 bg-red-50';
    if (days === 1) return 'text-orange-600 bg-orange-50';
    return 'text-blue-600 bg-blue-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Send Patient Reminders</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-[#007C91] text-2xl" />
              <span className="ml-2 text-gray-600">Loading upcoming patients...</span>
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

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex">
                <FaCheckCircle className="text-green-400" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    {success.message} ({success.reminders_sent} out of {success.total_selected} patients)
                  </p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-3 text-green-400 hover:text-green-600 transition-colors"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {patients.length > 0 && !loading && (
            <div className="space-y-4">
              {/* Header with select all */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Upcoming Appointments ({patients.length})
                </h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-[#007C91] hover:text-[#03585D] font-medium"
                >
                  {selectedAppointments.length === patients.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Patient list */}
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div
                    key={patient.appointment_id}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedAppointments.includes(patient.appointment_id)
                        ? 'border-[#007C91] bg-[#DAECED]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedAppointments.includes(patient.appointment_id)}
                          onChange={() => handleSelectAppointment(patient.appointment_id)}
                          className="mt-1 h-4 w-4 text-[#007C91] border-gray-300 rounded focus:ring-[#007C91]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{patient.patient_name}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDaysUntilColor(patient.days_until)}`}>
                              {getDaysUntilText(patient.days_until)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatAppointmentTime(patient.appointment_time)}
                          </p>
                          <p className="text-sm text-gray-500">
                            📞 {patient.phone_number}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Status: {patient.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {selectedAppointments.length} of {patients.length} patients selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReminders}
                    disabled={selectedAppointments.length === 0 || sending}
                    className="px-6 py-2 bg-[#007C91] hover:bg-[#03585D] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {sending ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        <span>Send SMS Reminders</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {patients.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Appointments</h3>
              <p className="text-gray-600">There are no patients with upcoming appointments in the next 1 day, 3 days and 7 days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
