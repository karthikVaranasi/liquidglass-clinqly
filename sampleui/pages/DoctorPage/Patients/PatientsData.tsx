import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { useLocation } from 'react-router-dom';
import dual from '../../../assets/dual_green.svg';
import PatientProfilePanel from './profile';
import { FaArrowLeft, FaUserPlus, FaEye } from 'react-icons/fa';
import AddPatientModal from '../../../components/AddPatientModal';
import type { Patient, DoctorData, AdminData } from '../../../utils/types';
import { useUserStore } from '../../../stores/useUserStore';



const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sortOption, setSortOption] = useState<string>('All Patients');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { userData, userRole } = useUserStore();
  
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search')?.toLowerCase() || '';

  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Compute patients URL based on user role
  const patientsUrl = useMemo(() => {
    if (!userData || !userRole) return null;
    
    const clinicId = (userData as DoctorData).clinic_id ?? (userData as AdminData).clinic_id;
    return clinicId ? `/dashboard/patients?clinic_id=${clinicId}` : '/dashboard/patients';
  }, [userData, userRole]);

  // Fetch patients function - reusable
  const fetchPatients = useCallback(async () => {
    if (!patientsUrl) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const patientsRes = await axiosInstance.get(patientsUrl);
      // API returns array directly, not wrapped in patients property
      const patientsData = Array.isArray(patientsRes.data) 
        ? patientsRes.data 
        : (patientsRes.data.patients || []);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [patientsUrl]);

  // Close the sidebar when clicking outside or on the left arrow
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSelectedPatient(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch patients on mount and when URL changes
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);


  const filteredPatients = (patients || []).filter((p) => {
    if (!searchQuery) return true;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return (
      fullName.includes(searchQuery) ||
      (p.phone_number && p.phone_number.toLowerCase().includes(searchQuery))
    );
  });


  const handleCloseSidebar = () => {
    setSelectedPatient(null); // Close the profile panel
  };

  const handlePatientAdded = () => {
    // Refresh the patients list using the reusable function
    fetchPatients();
  };



  return (
    <div className="w-full min-h-screen mx-auto bg-[#F4F8FB] pt-20 px-4 page-content-with-topbar">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <img src={dual} alt="dual icon" />
            <h2 className="text-2xl text-black font-bold font-sf">Patients - {patients.length}</h2>
          </div>
          <div className="flex gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#098289] text-white rounded-[4px] hover:bg-[#076d73] transition-colors"
            >
              <FaUserPlus size={16} />
              Add Patient
            </button>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="p-2 border border-[#098289] rounded-[4px] text-sm focus:outline-none w-[120px] h-[40px] text-left"
            >
              <option>All Patients</option>
              <option value="A to Z">A to Z</option>
              <option value="Z to A">Z to A</option>
              <option value="Old Patients">Old Patients</option>
            </select>
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#098289] mb-4"></div>
              <p className="text-gray-600 text-lg">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No patients found for this search or department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#F4F8FB] h-[46px]">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-6 font-bold tracking-wider text-xs">
                      Patient Name
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs">
                      Date of Birth
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs">
                      Contact
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs text-center">
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
                          <div className="text-gray-600">
                            {patient.dob 
                              ? (() => {
                                  const date = new Date(patient.dob);
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const year = date.getFullYear();
                                  return `${month}-${day}-${year}`;
                                })()
                              : 'Not provided'}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-gray-600">{patient.phone_number || "Not provided"}</div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="inline-flex items-center gap-2 bg-[#098289] hover:bg-[#076d77] text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                          >
                            <FaEye size={14} />
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

        {selectedPatient && (
          <div ref={sidebarRef}>
            <div className="absolute top-0 left-0 p-4">
              <FaArrowLeft
                onClick={handleCloseSidebar} // Attach the close handler to left arrow
                className="cursor-pointer text-gray-600"
                size={24}
              />
            </div>
            <PatientProfilePanel patient={selectedPatient} onClose={handleCloseSidebar} />
          </div>
        )}

        {/* Add Patient Modal */}
        <AddPatientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onPatientAdded={handlePatientAdded}
        />
      </div>
    </div>
  );
};

export default PatientsPage;
