import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaUserMd, FaSpinner} from 'react-icons/fa';
import axiosInstance from '../../../utils/axiosInstance';
import DoctorAppointmentsPage from '../Appointments/DoctorAppointmentsPage';
import { useUserStore } from '../../../stores/useUserStore';
import toast from 'react-hot-toast';


interface Doctor {
  id: number;
  name: string;
  department: string;
  email: string;
  rating?: number;
  patients?: number; 
}

interface Appointment {
  id: number;
  appointment_time: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  department: string;
  status: string;
  duration: number;
}

interface DoctorResponse {
  doctors: Doctor[];
}


interface DoctorLoginResponse {
  message: string;
  doctor: {
    id: number;
    name: string;
    department: string;
    email: string;
    clinic_id: number;
    clinic_name?: string;
    [key: string]: unknown;
  };
  access_token: string;
}

export default function DoctorsGrid() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarDoctorName, setSidebarDoctorName] = useState<string | null>(null);
  const [doctorPatientCount, setDoctorPatientCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loggingInDoctorId, setLoggingInDoctorId] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setAuthToken, setUserRole, setUserData, setClinicData, setUser } = useUserStore();

  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search') || '';
  const categoryFromUrl = new URLSearchParams(location.search).get('category') || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docRes, apptRes] = await Promise.all([
          axiosInstance.get<DoctorResponse>(`/dashboard/doctors`),
          axiosInstance.get(`/dashboard/appointments`), // Fetch appointments
        ]);
        
        const doctorsData = docRes.data.doctors;
        setDoctors(doctorsData);
        
        // Extract unique categories from doctors' departments
        const uniqueCategories = Array.from(
          new Set(doctorsData.map(doc => doc.department).filter(dept => dept && dept.toLowerCase() !== 'temp'))
        );
        setCategories(uniqueCategories);

        const apptData = apptRes.data;
        const countMap: Record<string, Set<string>> = {};

        // Count unique patients for each doctor
        apptData.appointments.forEach((appt: Appointment) => {
          if (!countMap[appt.doctor_name]) {
            countMap[appt.doctor_name] = new Set();
          }
          countMap[appt.doctor_name].add(appt.patient_name);
        });

        const finalCount: Record<string, number> = {};
        for (const [doctorName, patientsSet] of Object.entries(countMap)) {
          finalCount[doctorName] = patientsSet.size;
        }

        setDoctorPatientCount(finalCount);
        
        // Set the category from URL if present
        if (categoryFromUrl) {
          setSelectedCategory(categoryFromUrl);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryFromUrl]);

  useEffect(() => {
    let results = doctors.filter((doc) => doc.name.toLowerCase() !== 'temp doctor');

    if (searchQuery) {
      results = results.filter((doctor) =>
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== 'All') {
      results = results.filter(
        (doctor) =>
          doctor.department &&
          doctor.department.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      );
    }

    setFilteredDoctors(results);
  }, [searchQuery, selectedCategory, doctors]);

  const handleOpenAppointments = (doctorName: string) => {
    setSidebarDoctorName(doctorName);
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSidebarDoctorName(null);
  };

  const handleLoginAsDoctor = async (doctorId: number, mfaCode?: string) => {
    try {
      setLoggingInDoctorId(doctorId);
      
      // Prepare request body with optional MFA code
      const requestBody: { mfa_code?: string, doctor_id?: number } = {
        doctor_id: doctorId
      };
      if (mfaCode) {

        requestBody.mfa_code = mfaCode;
      }
      
      const response = await axiosInstance.post<DoctorLoginResponse & { mfa_required?: boolean }>(
        `/dashboard/auth/admin/login-as-doctor`,
        Object.keys(requestBody).length > 0 ? requestBody : undefined
      );

      const { doctor, access_token, message, mfa_required } = response.data;

      // Check if MFA is required (API returned mfa_required flag)
      // Also check response status - if 401, it might indicate MFA is required
      if ((mfa_required === true || response.status === 401) && !mfaCode) {
        // Get admin email for MFA verification
        // When admin is logged in, userData will be AdminData
        const currentUserData = useUserStore.getState().userData;
        const adminEmail = (currentUserData && 'email' in currentUserData) ? currentUserData.email : '';
        
        // Note: Secret is NOT needed - backend should have it stored for the admin user
        toast('MFA verification required', { icon: '🔐' });
        navigate('/dashboard/mfa/verify-code', { 
          state: { 
            email: adminEmail,
            doctorId: doctorId,
            type: 'login-as-doctor'
          } 
        });
        setLoggingInDoctorId(null);
        return;
      }

      // Fetch clinic data to get logo URL
      let clinicLogoUrl = null;
      let clinicPhoneNumber = '';
      let clinicAddress = '';
      try {
        const clinicResponse = await axiosInstance.get(`/dashboard/clinics/${doctor.clinic_id}`);
        const clinicData = clinicResponse.data;
        
        if (clinicData) {
          clinicLogoUrl = clinicData.logo_url || null;
          clinicPhoneNumber = clinicData.phone_number || '';
          clinicAddress = clinicData.address || '';
        }
      } catch (clinicError) {
        console.warn('Failed to fetch clinic logo:', clinicError);
        // Try alternative endpoint
        try {
          const altResponse = await axiosInstance.get('/dashboard/clinics');
          const clinics = Array.isArray(altResponse.data) ? altResponse.data : (altResponse.data?.clinics || []);
          const clinicData = clinics.find((c: any) => c.id === doctor.clinic_id);
          if (clinicData) {
            clinicLogoUrl = clinicData.logo_url || null;
            clinicPhoneNumber = clinicData.phone_number || '';
            clinicAddress = clinicData.address || '';
          }
        } catch (altError) {
          console.warn('Failed to fetch clinic from alternative endpoint:', altError);
        }
      }

      // Transform doctor name to first_name and last_name
      const nameParts = (doctor.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Prepare doctor data matching DoctorData interface
      const doctorData = {
        id: doctor.id,
        first_name: firstName,
        last_name: lastName,
        email: doctor.email,
        clinic_id: doctor.clinic_id,
        department: doctor.department,
      };

      // Set authentication token
      setAuthToken(access_token);

      // Set user role to doctor
      setUserRole('doctor');

      // Set doctor data
      setUserData(doctorData);

      // Set clinic data with logo URL
      if (doctor.clinic_name) {
        setClinicData({
          id: doctor.clinic_id,
          name: doctor.clinic_name,
          phone_number: clinicPhoneNumber,
          logo_url: clinicLogoUrl,
          address: clinicAddress,
          created_at: '',
        });
      }

      // Set user info
      setUser({
        userName: doctor.name,
        userEmail: doctor.email,
      });

      toast.success(message || 'Successfully logged in as doctor');
      
      // Navigate to doctor dashboard
      navigate('/doctor-dashboard');
    } catch (error: any) {
      console.error('Error logging in as doctor:', error);
      
      // Check if error is due to MFA requirement (401 with specific message)
      // For login-as-doctor endpoint, 401 usually means MFA is required
      if (error.response?.status === 401) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.message || errorData?.error || '';
        const requestUrl = error.config?.url || '';
        
        // If it's a login-as-doctor request, assume MFA is required unless explicitly stated otherwise
        const isLoginAsDoctorRequest = requestUrl.includes('/login-as-doctor');
        
        // If it's an MFA-related error or login-as-doctor request, redirect to MFA verification
        if (isLoginAsDoctorRequest || 
            errorMessage.toLowerCase().includes('mfa') || 
            errorMessage.toLowerCase().includes('two-factor') ||
            errorMessage.toLowerCase().includes('2fa') ||
            errorData?.mfa_required === true) {
          
          console.log('MFA required for login-as-doctor, redirecting to MFA verification');
          
          // Get admin email for MFA verification
          // When admin is logged in, userData will be AdminData
          const currentUserData = useUserStore.getState().userData;
          const adminEmail = (currentUserData && 'email' in currentUserData) ? currentUserData.email : '';
          
          // Note: Secret is NOT needed - backend should have it stored for the admin user
          toast('MFA verification required', { icon: '🔐' });
          navigate('/dashboard/mfa/verify-code', { 
            state: { 
              email: adminEmail,
              doctorId: doctorId,
              type: 'login-as-doctor'
            } 
          });
          setLoggingInDoctorId(null);
          return;
        }
      }
      
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to login as doctor. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoggingInDoctorId(null);
    }
  };

  // Close sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setShowSidebar(false); // Close the sidebar if the click is outside
        setSidebarDoctorName(null); // Clear selected doctor name
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const finalFilteredDoctors = filteredDoctors.length > 0 ? filteredDoctors : doctors;

  return (
    <div className="w-full h-fit pt-[70px] bg-[#F4F8FB] flex justify-center">
      <div className="w-full max-w-[1400px] py-6 mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <FaUserMd className="text-[#098289] text-lg" />
            <h1 className="text-2xl font-bold text-[#0D1A12] font-sf">Doctors</h1>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
              Department:
            </label>
            <select
              id="category-filter"
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#098289] focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Departments</option>
              {categories
                .filter((cat) => typeof cat === 'string' && cat.toLowerCase() !== 'temp')
                .map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Doctors Table */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading doctors...</p>
          </div>
        ) : finalFilteredDoctors.length === 0 ? (
          <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              No doctors found for this category or search.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm overflow-hidden">
            <table className="w-full table-auto text-sm">
              <thead className="bg-[#F4F8FB] h-[46px]">
                <tr className="text-left text-gray-600">
                  <th className="py-3 px-6 font-bold tracking-wider text-xs">
                    Doctor Name
                  </th>
                  <th className="py-3 px-6 font-bold tracking-wider text-xs">
                    Department
                  </th>
                  <th className="py-3 px-6 font-bold tracking-wider text-xs">
                    Email
                  </th>
                  <th className="py-3 px-6 font-bold tracking-wider text-xs">
                    Patients
                  </th>
                  <th className="py-3 px-6 font-bold tracking-wider text-xs text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {finalFilteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="border-t border-[#E5E7EB] hover:bg-[#F4F8FB] transition-colors">
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{doctor.name}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-gray-600">{doctor.department}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-gray-600">{doctor.email}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-gray-600">{doctorPatientCount[doctor.name] ?? 0}</div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleOpenAppointments(doctor.name)}
                          className="inline-flex items-center gap-2 bg-[#098289] hover:bg-[#076d77] text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                        >
                          <FaCalendarAlt className="text-xs" />
                          View Appointments
                        </button>
                        <button
                          className="inline-flex items-center justify-center bg-[#098289] hover:bg-[#076d77] text-white text-xs px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                          onClick={() => handleLoginAsDoctor(doctor.id)}
                          disabled={loggingInDoctorId === doctor.id}
                          title="Login as this doctor"
                        >
                          {loggingInDoctorId === doctor.id ? (
                            <>
                              <FaSpinner className="text-xs animate-spin" />
                            </>
                          ) : (
                            <>
                              {/* Login icon (arrow entering frame) */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                {/* Rectangular frame (open on left) - top, right, bottom */}
                                <path d="M6 6h12M18 6v12M6 18h12" />
                                {/* Arrow pointing right into frame */}
                                <path d="M2 12h8M10 8l4 4-4 4" />
                              </svg>
                              <span className="sr-only">Login</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sidebar for DoctorAppointmentsPage */}
        {showSidebar && sidebarDoctorName && (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50">
            <div
              className="bg-white w-[500px] h-full overflow-y-auto rounded-l-xl shadow-xl transform transition-transform duration-300 translate-x-0"
              ref={sidebarRef}
            >
              
              <DoctorAppointmentsPage doctorName={sidebarDoctorName} onClose={handleCloseSidebar} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
