import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { clearAuth } from '../utils/auth';
import { useUserStore } from '../stores/useUserStore';

interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  message?: string;
  doctor: {
    id: number;
    name: string;
    department: string;
    email: string;
    role: string;
    clinic_id: number;
    clinic_name: string;
    assigned_twilio_phone_number: string;
    clinic_logo_url: string | null;
    clinic_address: string;
  };
  clinic?: {
    name: string;
    logo_url: string;
    twilio_phone_number: string;
    clinic_id: number;
    clinic_number: string;
    address: {
      zip: string;
      city: string;
      state: string;
      street: string;
    };
    clinic_schedule: {
      [key: string]: {
        start?: string;
        end?: string;
        closed?: boolean;
      };
    };
  };
}

export const IMSAuthHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { setAuthToken, setUserRole, setUserData, setClinicData } = useUserStore();

  useEffect(() => {
    const handleSSOAuth = async () => {
      try {
        // Get token from URL parameters
        const token = searchParams.get('token');
        
        if (!token) {
          setError('No authentication token provided');
          return;
        }

        console.log('Processing SSO authentication token...');

        // Clear any existing authentication data before processing SSO
        // This ensures that if another user is already logged in, we clear their session
        clearAuth();

        // Send token to backend to exchange for access token
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/dashboard/auth/sso-login`, {
          token: token
        });

        const authData: BackendAuthResponse = response.data;
        
        // Store only the authentication token
        setAuthToken(authData.access_token);
        
        // Transform the SSO doctor data to match DoctorData interface
        const nameParts = authData.doctor.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const doctorData = {
          id: authData.doctor.id,
          first_name: firstName,
          last_name: lastName,
          email: authData.doctor.email,
          clinic_id: authData.doctor.clinic_id,
          department: authData.doctor.department,
        };
        
        // Use response data directly instead of fetching again
        setUserRole((authData.doctor.role as 'doctor') || 'doctor');
        setUserData(doctorData);
        
        // Set clinic data if available
        const clinicLogo = authData.clinic?.logo_url || authData.doctor.clinic_logo_url || null;
        const clinicName = authData.clinic?.name || authData.doctor.clinic_name || '';
        const twilioPhoneNumber = authData.clinic?.twilio_phone_number || authData.doctor.assigned_twilio_phone_number || '';
        
        if (clinicName || clinicLogo || twilioPhoneNumber) {
          setClinicData({
            id: authData.doctor.clinic_id,
            name: clinicName,
            phone_number: twilioPhoneNumber,
            logo_url: clinicLogo,
            address: '',
            created_at: '',
          });
        }

        console.log('✅ SSO authentication successful');

        // Navigate to doctor dashboard
        navigate('/doctor-dashboard', {
          state: {
            doctor: authData.doctor,
          },
        });

      } catch (error) {
        console.error('SSO authentication failed:', error);
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Authentication failed';
          setError(errorMessage);
        } else {
          setError('Authentication failed. Please try again.');
        }
      }
    };

    // Check if we have a token in the URL - if so, process SSO
    const token = searchParams.get('token');
    if (token) {
      // Process SSO authentication (this will clear existing session)
      handleSSOAuth();
    } else {
      // No token - redirect to login
      navigate('/');
    }
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FB]">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Failed</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate('/')} 
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F8FB]">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Authenticating</h2>
        <p className="text-gray-600">Please wait while we verify your credentials...</p>
      </div>
    </div>
  );
};