import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import OTPInput from '../../../components/OTPInput';
import { useUserStore } from '../../../stores/useUserStore';
import { decodeJWT, getRoleFromToken } from '../../../utils/jwtUtils';
import toast from 'react-hot-toast';

// Use regular axios instance for MFA verification
// Note: If backend requires cookies, ensure CORS is properly configured

const MFAVerify: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuthToken, setUserRole, setUserData, setClinicData, setUser } = useUserStore();
  const hasCheckedEmail = useRef(false);

  // Get email, password, and secret from location state only
  const email = useMemo(() => {
    return location.state?.email || '';
  }, [location.state?.email]);

  const password = useMemo(() => {
    return location.state?.password || null;
  }, [location.state?.password]);

  // Note: Secret is NOT needed for login MFA verification
  // The backend should have the user's secret stored from MFA setup
  // Secret is only needed during initial MFA setup verification (in MFASettings.tsx)

  // Check if this is for "login as doctor" flow
  const mfaType = useMemo(() => {
    return location.state?.type || 'login';
  }, [location.state?.type]);

  useEffect(() => {
    // Only check once on mount to prevent infinite loops
    if (hasCheckedEmail.current) return;
    
    // For login-as-doctor flow, we don't need email - admin is already logged in
    if (mfaType === 'login-as-doctor') {
      hasCheckedEmail.current = true;
      return;
    }
    
    // If no email and not login-as-doctor type, redirect to login
    if (!email && mfaType !== 'login-as-doctor') {
      hasCheckedEmail.current = true;
      toast.error('Please login first');
      navigate('/');
    } else {
      hasCheckedEmail.current = true;
    }
  }, [email, navigate, mfaType]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if this is "login as doctor" flow
      const doctorIdFromState = location.state?.doctorId;
      const pendingType = mfaType;

      if (pendingType === 'login-as-doctor' && doctorIdFromState) {
        // Handle "login as doctor" flow - call login-as-doctor endpoint with MFA code
        const doctorId = typeof doctorIdFromState === 'number' ? doctorIdFromState : parseInt(doctorIdFromState.toString(), 10);
        const { authToken: currentAdminToken } = useUserStore.getState();
        
        if (!currentAdminToken) {
          throw new Error('Admin session expired. Please login again.');
        }

        // Call login-as-doctor endpoint with MFA code
        // Note: Secret is NOT needed here - backend should have it stored for the admin user
        const loginResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/dashboard/auth/admin/login-as-doctor`,
          { 
            doctor_id: doctorId,
            mfa_code: otp,
          },
          {
            headers: {
              'Authorization': `Bearer ${currentAdminToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const { doctor, access_token: doctorToken, message } = loginResponse.data;

        if (!doctorToken) {
          throw new Error('No access token received');
        }

        // Set authentication token
        setAuthToken(doctorToken);

        // Set user role to doctor
        setUserRole('doctor');

        // Transform doctor name to first_name and last_name
        const nameParts = (doctor.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Prepare doctor data
        const doctorDataObj = {
          id: doctor.id,
          first_name: firstName,
          last_name: lastName,
          email: doctor.email,
          clinic_id: doctor.clinic_id,
          department: doctor.department,
        };

        setUserData(doctorDataObj);

        // Fetch clinic data to get logo URL
        try {
          const clinicResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/dashboard/clinics/${doctor.clinic_id}`,
            {
              headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const clinicData = clinicResponse.data;
          
          if (clinicData) {
            setClinicData({
              id: doctor.clinic_id,
              name: doctor.clinic_name || clinicData.name || '',
              phone_number: clinicData.phone_number || '',
              logo_url: clinicData.logo_url || null,
              address: clinicData.address || '',
              created_at: clinicData.created_at || '',
            });

            setUser({
              userName: doctor.name,
              userEmail: doctor.email,
            });
          } else {
            setUser({
              userName: doctor.name,
              userEmail: doctor.email,
            });
          }
        } catch (clinicError) {
          console.warn('Failed to fetch clinic data:', clinicError);
          setUser({
            userName: doctor.name,
            userEmail: doctor.email,
          });
        }


        toast.success(message || 'MFA verification successful! Logged in as doctor.');
        navigate('/doctor-dashboard');
        return;
      }

      // Regular login MFA verification
      // Call the login endpoint again with email, password, and mfa_code
      // The login endpoint handles both normal and MFA login
      // Note: Secret is NOT needed - backend should have it stored for the user
      if (!password) {
        throw new Error('Password is required for MFA verification. Please login again.');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/dashboard/auth/admin/login`,
        {
          email: email,
          password: password,
          mfa_code: otp,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      console.log('MFA Verify Response:', data);

      // According to AdminLoginResponse schema:
      // - access_token: string | null (null if MFA required)
      // - mfa_required: boolean (default false)
      // - message: string (required)
      // - admin: object | null (required)

      // Check if MFA is still required (shouldn't happen if code is correct)
      if (data.mfa_required === true) {
        throw new Error(data.message || 'MFA code verification failed. Please try again.');
      }

      // Get access token from response
      const accessToken = data.access_token;

      if (!accessToken) {
        throw new Error(data.message || 'Invalid MFA code or login failed. Please try again.');
      }

      // Regular login flow (admin or doctor)
      // Set authentication token
      setAuthToken(accessToken);

      // Decode token to get role and user information
      const decodedToken = decodeJWT(accessToken);
      if (!decodedToken) {
        throw new Error('Invalid token format');
      }

      // Get role from token
      const userRole = decodedToken.role || getRoleFromToken(accessToken);
      if (!userRole) {
        throw new Error('Unable to determine user role from token');
      }

      console.log('Decoded token role:', userRole);
      setUserRole(userRole);

      // Set user data based on role
      if (userRole === 'admin') {
        // Set admin data if available in response
        if (data.admin) {
          const nameParts = (data.admin.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const adminData = {
            id: data.admin.id,
            first_name: firstName,
            last_name: lastName,
            email: data.admin.email,
            clinic_id: data.admin.clinic_id || 0,
          };

          setUserData(adminData);

          // Set clinic data if available
          if (data.admin.clinic_name || data.admin.assigned_twilio_phone_number || data.admin.clinic_logo_url) {
            setClinicData({
              id: data.admin.clinic_id || 0,
              name: data.admin.clinic_name || '',
              phone_number: data.admin.assigned_twilio_phone_number || '',
              logo_url: data.admin.clinic_logo_url || null,
              address: '',
              created_at: '',
            });
          }
        } else {
          // If admin data is not in response, use token data
          setUser({});
        }
      } else if (userRole === 'doctor') {
        // Set doctor data if available in response
        if (data.doctor) {
          const nameParts = (data.doctor.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const doctorDataObj = {
            id: data.doctor.id,
            first_name: firstName,
            last_name: lastName,
            email: data.doctor.email,
            clinic_id: data.doctor.clinic_id,
            department: data.doctor.department,
          };

          setUserData(doctorDataObj);
        }

        // Set clinic data if available
        if (data.doctor?.clinic_name || data.doctor?.assigned_twilio_phone_number || data.doctor?.clinic_logo_url) {
          setClinicData({
            id: data.doctor.clinic_id,
            name: data.doctor.clinic_name || '',
            phone_number: data.doctor.assigned_twilio_phone_number || '',
            logo_url: data.doctor.clinic_logo_url || null,
            address: '',
            created_at: '',
          });
        }
      }

      toast.success(data.message || 'MFA verification successful!');
      
      // Navigate based on role
      if (userRole === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      
      // Handle different error scenarios with user-friendly messages
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        // Check for specific error messages from backend
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else {
          // Provide user-friendly messages based on status code
          if (status === 401 || status === 400) {
            errorMessage = 'Invalid verification code. Please check your authenticator app and try again.';
          } else if (status === 403) {
            errorMessage = 'Access denied. Please try logging in again.';
          } else if (status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
      } else if (err.message && !err.message.includes('status code')) {
        // Only use err.message if it's not a technical axios error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setOtp(''); // Clear OTP on error
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F8FB] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#098289] rounded-full flex items-center justify-center">
              <FaShieldAlt className="text-white text-2xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-sf">
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 font-sf">
            Enter the 6-digit code from your authenticator app
          </p>
          {mfaType === 'login-as-doctor' && (
            <p className="text-sm text-blue-600 mt-2 font-sf font-semibold">
              Logging in as Doctor
            </p>
          )}
          {email && (
            <p className="text-sm text-gray-500 mt-2 font-sf">
              Verifying for: {email}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-sf">{error}</p>
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <OTPInput
            value={otp}
            onChange={setOtp}
            onComplete={handleVerify}
            disabled={loading}
            error={!!error}
          />
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
          className={`w-full py-3 rounded-lg font-sf font-semibold transition-all ${
            loading || otp.length !== 6
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#098289] text-white hover:bg-[#076d73] shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Verifying...
            </span>
          ) : (
            'Verify Code'
          )}
        </button>

        {/* Back Button */}
        <button
          onClick={handleBack}
          disabled={loading}
          className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800 font-sf flex items-center justify-center gap-2 transition-colors"
        >
          <FaArrowLeft className="text-sm" />
          Back to Login
        </button>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 font-sf">
            Having trouble? Check that your device time is synchronized
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFAVerify;

