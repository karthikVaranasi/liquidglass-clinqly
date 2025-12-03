import React, { useEffect, useState, useRef } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { useLocation } from 'react-router-dom';
import { FaUser, FaTimes } from 'react-icons/fa';
import dayjs from 'dayjs';
import type { Patient } from '../../../utils/types';

interface Appointment {
  id: number;
  appointment_time: string;
  patient_id: number;
  doctor_name: string;
  status: string;
}

const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [patientProviders, setPatientProviders] = useState<Record<number, string[]>>({});
  const profileRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search') || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientsRes, appointmentsRes] = await Promise.all([
          axiosInstance.get(`/dashboard/patients`),
          axiosInstance.get(`/dashboard/appointments`)
        ]);
        
        // Handle both response formats: array directly or wrapped in object
        const patientsData = Array.isArray(patientsRes.data) 
          ? patientsRes.data 
          : (patientsRes.data.patients || []);
        
        console.log('Patients data:', patientsData);
        setPatients(patientsData);
        
        // Extract unique providers from appointments
        const appointmentsData = appointmentsRes.data.appointments || [];
        const uniqueProviders = Array.from(
          new Set(appointmentsData.map((appt: any) => appt.doctor_name).filter(Boolean))
        ).sort() as string[];
        setProviders(uniqueProviders);
        
        // Map patients to their providers by matching patient names
        const providerMap: Record<number, string[]> = {};
        
        patientsData.forEach((patient: Patient) => {
          const patientFullName = `${patient.first_name} ${patient.last_name}`.trim().toLowerCase();
          
          appointmentsData.forEach((appt: any) => {
            // Clean the appointment patient name (remove {{ }} placeholders and extra spaces)
            const apptPatientName = (appt.patient_name || '')
              .replace(/\{\{.*?\}\}/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();
            
            // Match by patient_id if available, otherwise match by name
            const isMatch = (appt.patient_id && appt.patient_id === patient.id) || 
                          (apptPatientName === patientFullName);
            
            if (isMatch && appt.doctor_name) {
              if (!providerMap[patient.id]) {
                providerMap[patient.id] = [];
              }
              if (!providerMap[patient.id].includes(appt.doctor_name)) {
                providerMap[patient.id].push(appt.doctor_name);
              }
            }
          });
        });
        
        console.log('Provider Map:', providerMap);
        setPatientProviders(providerMap);
        
        setError('');
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load patients. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let results = patients;
    
    // Filter by provider
    if (selectedProvider !== 'all') {
      results = results.filter((patient) => {
        const providers = patientProviders[patient.id] || [];
        return providers.includes(selectedProvider);
      });
    }
    
    // Filter patients by search query (by name or phone)
    if (searchQuery) {
      results = results.filter((patient) => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        const phone = patient.phone_number?.toLowerCase() || '';
        return fullName.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery.toLowerCase());
      });
    }

    setFilteredPatients(results);
  }, [searchQuery, patients, selectedProvider, patientProviders]);

  // Handle view patient profile
  const handleViewProfile = async (patient: Patient) => {
    setSelectedPatient(patient);
    setShowProfile(true);
    
    // Fetch patient's appointments
    try {
      const response = await axiosInstance.get(`/dashboard/appointments`);
      const allAppointments = response.data.appointments || [];
      const patientAppts = allAppointments.filter(
        (appt: Appointment) => appt.patient_id === patient.id
      );
      setPatientAppointments(patientAppts);
    } catch (err) {
      console.error('Failed to fetch patient appointments:', err);
      setPatientAppointments([]);
    }
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setSelectedPatient(null);
    setPatientAppointments([]);
  };

  // Close profile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        handleCloseProfile();
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile]);
  
  return (
    <div className="w-full min-h-screen mx-auto bg-[#F4F8FB] pt-20 px-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <FaUser className="text-[#098289] text-lg" />
            <h2 className="text-2xl font-bold font-sf">Patients - <span className="text-[#098289]">{patients.length}</span></h2>
          </div>
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 && !error ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {patients.length === 0 ? 'No patients available.' : 'No patients found for this search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#F4F8FB] h-[46px]">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[30%]">
                      Patient Name
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[25%]">
                      Date of Birth
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[25%]">
                      Phone Number
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs text-center w-[20%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredPatients.map((patient) => {
                    return (
                      <tr key={patient.id} className="border-t border-[#E5E7EB] hover:bg-[#F4F8FB] transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-medium text-gray-900">
                            {`${patient.first_name} ${patient.last_name}`.trim()}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-gray-600">{patient.dob}</div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-gray-600">{patient.phone_number}</div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => handleViewProfile(patient)}
                            className="inline-flex items-center gap-2 bg-[#098289] hover:bg-[#076d77] text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                          >
                            <FaUser className="text-xs" />
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Patient Profile Sidebar */}
        {showProfile && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50">
            <div
              ref={profileRef}
              className="bg-white w-full sm:w-[500px] h-full overflow-y-auto shadow-xl"
            >
              {/* Profile Header */}
              <div className="sticky top-0 bg-[#098289] text-white p-6 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Patient Profile</h2>
                  <button
                    onClick={handleCloseProfile}
                    className="text-white hover:text-gray-200 transition"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Profile Content */}
              <div className="p-6">
                {/* Patient Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Full Name</label>
                      <p className="text-sm font-medium text-gray-900">
                        {`${selectedPatient.first_name} ${selectedPatient.last_name}`.trim()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                      <p className="text-sm text-gray-700">{selectedPatient.dob}</p>
                    </div>
                <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Phone Number</label>
                      <p className="text-sm text-gray-700">{selectedPatient.phone_number}</p>
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                {selectedPatient.guardians && selectedPatient.guardians.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h3>
                    {selectedPatient.guardians.map((guardian, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3 mb-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Guardian Name</label>
                          <p className="text-sm font-medium text-gray-900">
                            {`${guardian.first_name} ${guardian.last_name}`.trim()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                          <p className="text-sm text-gray-700">{guardian.dob}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Relationship</label>
                          <p className="text-sm text-gray-700 capitalize">{guardian.relationship_to_patient}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Appointments */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
                  {patientAppointments.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500">No appointments found for this patient.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientAppointments
                        .sort((a, b) => dayjs(b.appointment_time).valueOf() - dayjs(a.appointment_time).valueOf())
                        .map((appt) => (
                          <div key={appt.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {dayjs(appt.appointment_time).format('MMM D, YYYY')}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {dayjs(appt.appointment_time).format('h:mm A')}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                appt.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : appt.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Provider:</span> {appt.doctor_name}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsPage;
