import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaCheckCircle, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import OTPInput from '../../../components/OTPInput';
import QRCodeDisplay from '../../../components/QRCodeDisplay';
import axiosInstance from '../../../utils/axiosInstance';
import toast from 'react-hot-toast';

interface MFAStatus {
  mfa_enabled: boolean;
  mfa_setup?: boolean;
}

interface MFASetupResponse {
  qr_code_url?: string;
  qr_code?: string;
  qrcode?: string;
  qr_url?: string;
  secret: string;
}

const MFASettings: React.FC = () => {
  const navigate = useNavigate();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<MFAStatus>('/dashboard/mfa/status');
      setMfaStatus(response.data);
    } catch (err: any) {
      toast.error('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    try {
      setSetupLoading(true);
      setError('');
      
      // Clear any previous setup data to ensure fresh setup
      setSetupData(null);
      setVerificationCode('');

      // Get fresh setup from backend (this should invalidate any previous setup)
      const response = await axiosInstance.get<MFASetupResponse>('/dashboard/mfa/setup');
      
      // Handle different possible field names for QR code URL
      const qrCodeUrl = response.data.qr_code_url || 
                       response.data.qr_code || 
                       response.data.qrcode || 
                       response.data.qr_url || 
                       '';
      
      setSetupData({
        qr_code_url: qrCodeUrl,
        secret: response.data.secret || '',
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           'Failed to setup MFA. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (!setupData || !setupData.secret) {
      setError('Setup session expired. Please click "Enable MFA" again to start a new setup.');
      setSetupData(null);
      setVerificationCode('');
      return;
    }

    try {
      setVerifying(true);
      setError('');

      const response = await axiosInstance.post('/dashboard/mfa/verify', {
        code: verificationCode,
        secret: setupData.secret,
      });

      // Only show success if the response indicates success
      if (response.data?.success !== false) {
        toast.success('MFA enabled successfully!');
        setSetupData(null);
        setVerificationCode('');
        await fetchMFAStatus();
      } else {
        throw new Error(response.data?.message || 'Verification failed');
      }
    } catch (err: any) {
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
            errorMessage = 'Access denied. Please try setting up MFA again.';
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
      
      // Don't clear setup data on wrong code - let user try again
      // Only clear if it's a session/expiration error (not 400/401 for wrong code)
      // 400/401 can mean wrong code, which should allow retry
      // Only clear on 403 (forbidden) or 500+ (server errors) that indicate session issues
      if (err.response?.status === 403 || (err.response?.status && err.response.status >= 500)) {
        setSetupData(null);
        setVerificationCode('');
      } else {
        // For wrong code (400/401), just clear the input code but keep setup data
        setVerificationCode('');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    try {
      setDisabling(true);
      setError('');

      await axiosInstance.post('/dashboard/mfa/disable');

      toast.success('MFA disabled successfully');
      await fetchMFAStatus();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           'Failed to disable MFA. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDisabling(false);
    }
  };

  const handleCancelSetup = async () => {
    // If setup data exists, try to cancel/abort the setup on backend
    if (setupData) {
      try {
        // Call backend to cancel/abort the MFA setup (if endpoint exists)
        // This invalidates the secret so it can't be used later
        await axiosInstance.post('/dashboard/mfa/cancel-setup').catch(() => {
          // If endpoint doesn't exist, that's okay - backend should handle expiration
        });
      } catch (err) {
        // Silently fail - the backend should expire the setup automatically
      }
    }
    
    setSetupData(null);
    setVerificationCode('');
    setError('');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#098289] mb-4"></div>
          <p className="text-gray-600 text-lg font-sf">Loading MFA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pt-[64px] bg-[#F4F8FB]">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-sf transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 font-sf mb-2">
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 font-sf">
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-sf">{error}</p>
          </div>
        )}

        {/* MFA Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                mfaStatus?.mfa_enabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {mfaStatus?.mfa_enabled ? (
                  <FaCheckCircle className="text-green-600 text-xl" />
                ) : (
                  <FaShieldAlt className="text-gray-400 text-xl" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 font-sf">
                  MFA Status
                </h2>
                <p className={`text-sm font-sf ${
                  mfaStatus?.mfa_enabled ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {mfaStatus?.mfa_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            {mfaStatus?.mfa_enabled && (
              <button
                onClick={handleDisableMFA}
                disabled={disabling}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-sf font-semibold text-sm shadow-sm hover:shadow-md"
              >
                {disabling ? (
                  <span className="flex items-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Disabling...
                  </span>
                ) : (
                  'Disable MFA'
                )}
              </button>
            )}
          </div>
          
          {/* Disable MFA Section - Always show when MFA is enabled */}
          {mfaStatus?.mfa_enabled && !setupData && (
            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 font-sf">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-600 font-sf">
                    Disabling MFA will remove the extra security layer from your account. 
                    You'll only need your password to log in.
                  </p>
                </div>
                <button
                  onClick={handleDisableMFA}
                  disabled={disabling}
                  className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-sf font-semibold text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {disabling ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Disabling...</span>
                    </>
                  ) : (
                    <>
                      <FaShieldAlt className="w-4 h-4" />
                      <span>Disable MFA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          

          {!mfaStatus?.mfa_enabled && !setupData && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-700 mb-4 font-sf">
                Two-factor authentication adds an extra layer of security to your account. 
                You'll need to enter a code from your authenticator app each time you log in.
              </p>
              <button
                onClick={handleEnableMFA}
                disabled={setupLoading}
                className="px-6 py-3 bg-[#098289] hover:bg-[#076d73] text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-sf font-semibold"
              >
                {setupLoading ? (
                  <span className="flex items-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  'Enable MFA'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Setup Flow */}
        {setupData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 font-sf">
              Scan QR Code
            </h2>
            <p className="text-gray-600 mb-6 font-sf">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            {/* QR Code */}
            <div className="mb-6">
              {setupData.qr_code_url ? (
                <QRCodeDisplay
                  qrCodeUrl={setupData.qr_code_url}
                  secret={setupData.secret}
                  alt="MFA Setup QR Code"
                />
              ) : (
                <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200 p-4">
                  <p className="text-gray-500 text-sm text-center mb-2">
                    QR code URL not provided by API
                  </p>
                  <p className="text-xs text-gray-400 text-center">
                    Please check the browser console for API response details
                  </p>
                </div>
              )}
            </div>

            {/* Verification Step */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-sf">
                Verify Setup
              </h3>
              <p className="text-gray-600 mb-4 text-sm font-sf">
                Enter the 6-digit code from your authenticator app to complete setup
              </p>

              <div className="mb-4">
                <OTPInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onComplete={handleVerifySetup}
                  disabled={verifying}
                  error={!!error}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifySetup}
                  disabled={verifying || verificationCode.length !== 6}
                  className={`px-6 py-2 rounded-lg font-sf font-semibold transition-all ${
                    verifying || verificationCode.length !== 6
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#098289] text-white hover:bg-[#076d73]'
                  }`}
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <FaSpinner className="animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
                <button
                  onClick={handleCancelSetup}
                  disabled={verifying}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-sf font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        {mfaStatus?.mfa_enabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaShieldAlt className="text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1 font-sf">
                  MFA is Enabled
                </h3>
                <p className="text-sm text-blue-800 font-sf">
                  Your account is protected with two-factor authentication. 
                  You'll need to enter a code from your authenticator app each time you log in.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASettings;

