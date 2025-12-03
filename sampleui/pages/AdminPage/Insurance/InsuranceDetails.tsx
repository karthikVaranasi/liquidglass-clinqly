import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaUpload, FaImage, FaTimes, FaCheckCircle, FaFilePdf, FaExclamationTriangle } from 'react-icons/fa';
import axiosInstance from '../../../utils/axiosInstance';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface TokenVerificationResponse {
  valid: boolean;
  patient_id: number;
  appointment_id: number;
  doctor_id: number;
  expires_at: string;
  message: string;
}

const InsuranceDetailsPage: React.FC = () => {
  const location = useLocation();
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [insuranceIdDocumentFile, setInsuranceIdDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInvalidTokenModal, setShowInvalidTokenModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(false);
  
  const idDocumentInputRef = useRef<HTMLInputElement>(null);
  const insuranceIdDocumentInputRef = useRef<HTMLInputElement>(null);

  // Function to verify token with backend
  // Using plain axios to avoid redirect on 401 errors
  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      setIsValidatingToken(true);
      // Use plain axios instance to avoid the redirect interceptor
      const response = await axios.get<TokenVerificationResponse>(
        `${import.meta.env.VITE_API_URL}/dashboard/patients/documents/verify-token`,
        {
          params: { token: tokenToVerify }
        }
      );
      
      if (response.data.valid) {
        setIsTokenValid(true);
        setShowInvalidTokenModal(false);
        setTokenError('');
        return true;
      } else {
        setTokenError('Token is invalid. Please use a valid upload link.');
        setShowInvalidTokenModal(true);
        setIsTokenValid(false);
        return false;
      }
    } catch (error: any) {
      console.error('Error verifying token:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Invalid or expired token. Please request a new upload link.';
      setTokenError(errorMessage);
      setShowInvalidTokenModal(true);
      setIsTokenValid(false);
      return false;
    } finally {
      setIsValidatingToken(false);
    }
  };

  useEffect(() => {
    // Extract token directly from location.search to ensure we get the latest value
    const urlParams = new URLSearchParams(location.search);
    const currentToken = urlParams.get('token');
    
    // Update token state
    setToken(currentToken);

    // Reset file states and modals when token changes
    setIdDocumentFile(null);
    setInsuranceIdDocumentFile(null);
    setShowSuccessModal(false);
    setIsTokenValid(false);
    if (idDocumentInputRef.current) idDocumentInputRef.current.value = '';
    if (insuranceIdDocumentInputRef.current) insuranceIdDocumentInputRef.current.value = '';

    if (!currentToken) {
      setTokenError('Missing token parameter. Please use a valid upload link.');
      setShowInvalidTokenModal(true);
      setIsTokenValid(false);
      return;
    }

    // Verify token with backend
    verifyToken(currentToken);
  }, [location.search]);

  const handleIdDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (images and PDF)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        toast.error('Please upload an image file (JPG, PNG, GIF, WEBP) or PDF.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB.');
        return;
      }

      setIdDocumentFile(file);
    }
  };

  const handleInsuranceIdDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (images and PDF)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        toast.error('Please upload an image file (JPG, PNG, GIF, WEBP) or PDF.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB.');
        return;
      }

      setInsuranceIdDocumentFile(file);
    }
  };

  const removeIdDocument = () => {
    setIdDocumentFile(null);
    if (idDocumentInputRef.current) {
      idDocumentInputRef.current.value = '';
    }
  };

  const removeInsuranceIdDocument = () => {
    setInsuranceIdDocumentFile(null);
    if (insuranceIdDocumentInputRef.current) {
      insuranceIdDocumentInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Missing token. Please use a valid upload link.');
      return;
    }

    // Verify token before submitting
    const isValid = await verifyToken(token);
    if (!isValid) {
      return;
    }

    if (!idDocumentFile || !insuranceIdDocumentFile) {
      toast.error('Please upload both documents.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('token', token);
      formData.append('id_document', idDocumentFile);
      formData.append('insurance_id_document', insuranceIdDocumentFile);

      // Submit to backend
      await axiosInstance.post(
        '/dashboard/patients/documents/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Show success modal
      setShowSuccessModal(true);
      
      // Reset form
      setIdDocumentFile(null);
      setInsuranceIdDocumentFile(null);
      if (idDocumentInputRef.current) idDocumentInputRef.current.value = '';
      if (insuranceIdDocumentInputRef.current) insuranceIdDocumentInputRef.current.value = '';
    } catch (error: any) {
      console.error('Error uploading files:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload files. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitEnabled = isTokenValid && idDocumentFile !== null && insuranceIdDocumentFile !== null && !isSubmitting && !isValidatingToken;

  return (
    <div className="w-full min-h-screen pt-[64px] bg-[#F4F8FB]">
      {/* Invalid/Expired Token Modal - Non-dismissible */}
      {showInvalidTokenModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FaExclamationTriangle className="text-red-600 text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 font-sf mb-2">
                Invalid Link
              </h2>
              <p className="text-gray-600 font-sf mb-6">
                {tokenError || 'This upload link is invalid or has expired. Please request a new link.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Non-dismissible */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 font-sf mb-2">
                Documents Uploaded Successfully
              </h2>
              <p className="text-gray-600 font-sf">
                Your documents have been uploaded successfully. Thank you!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state while validating token */}
      {isValidatingToken && !showInvalidTokenModal && !showSuccessModal && (
        <div className="w-full min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#098289] mx-auto mb-4"></div>
            <p className="text-gray-600 font-sf">Validating token...</p>
          </div>
        </div>
      )}

      {/* Only show upload UI if token is valid and not validating */}
      {!showInvalidTokenModal && !showSuccessModal && !isValidatingToken && (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 font-sf mb-2">
              Upload Documents
            </h1>
            <p className="text-gray-600 font-sf">
              Upload ID document and insurance ID document to proceed
            </p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ID Document Upload Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 font-sf mb-1">
                ID Document
              </h2>
              <p className="text-sm text-gray-500 font-sf">
                Upload ID document (Image or PDF, Max 10MB)
              </p>
              <span className="text-xs text-red-500 font-sf mt-1 block">* Required</span>
            </div>

            {!idDocumentFile ? (
              <div
                onClick={() => isTokenValid && idDocumentInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isTokenValid
                    ? 'border-gray-300 cursor-pointer hover:border-[#098289] hover:bg-gray-50'
                    : 'border-gray-200 cursor-not-allowed opacity-50 bg-gray-50'
                }`}
              >
                <FaUpload className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-sm font-medium text-gray-700 font-sf mb-1">
                  Click to upload file
                </p>
                <p className="text-xs text-gray-500 font-sf">
                  JPG, PNG, GIF, WEBP, PDF (Max 10MB)
                </p>
                <input
                  ref={idDocumentInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,.pdf"
                  onChange={handleIdDocumentUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {idDocumentFile.type === 'application/pdf' ? (
                      <FaFilePdf className="text-red-500" size={32} />
                    ) : (
                      <FaImage className="text-[#098289]" size={32} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-sf">
                        {idDocumentFile.name}
                      </p>
                      <p className="text-xs text-gray-500 font-sf">
                        {(idDocumentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeIdDocument}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Insurance ID Document Upload Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 font-sf mb-1">
                Insurance ID Document
              </h2>
              <p className="text-sm text-gray-500 font-sf">
                Upload insurance ID document (Image or PDF, Max 10MB)
              </p>
              <span className="text-xs text-red-500 font-sf mt-1 block">* Required</span>
            </div>

            {!insuranceIdDocumentFile ? (
              <div
                onClick={() => isTokenValid && insuranceIdDocumentInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isTokenValid
                    ? 'border-gray-300 cursor-pointer hover:border-[#098289] hover:bg-gray-50'
                    : 'border-gray-200 cursor-not-allowed opacity-50 bg-gray-50'
                }`}
              >
                <FaUpload className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-sm font-medium text-gray-700 font-sf mb-1">
                  Click to upload file
                </p>
                <p className="text-xs text-gray-500 font-sf">
                  JPG, PNG, GIF, WEBP, PDF (Max 10MB)
                </p>
                <input
                  ref={insuranceIdDocumentInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,.pdf"
                  onChange={handleInsuranceIdDocumentUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {insuranceIdDocumentFile.type === 'application/pdf' ? (
                      <FaFilePdf className="text-red-500" size={32} />
                    ) : (
                      <FaImage className="text-[#098289]" size={32} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-sf">
                        {insuranceIdDocumentFile.name}
                      </p>
                      <p className="text-xs text-gray-500 font-sf">
                        {(insuranceIdDocumentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeInsuranceIdDocument}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!isSubmitEnabled}
            className={`px-8 py-3 rounded-lg font-sf font-semibold transition-all ${
              isSubmitEnabled
                ? 'bg-[#098289] text-white hover:bg-[#076d73] shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FaCheckCircle size={16} />
                Submit
              </span>
            )}
          </button>
        </div>

          {/* Status Indicators */}
          <div className="mt-6 flex gap-4 text-sm font-sf">
            <div className={`flex items-center gap-2 ${
              idDocumentFile ? 'text-green-600' : 'text-gray-400'
            }`}>
              <FaCheckCircle size={16} />
              <span>ID Document {idDocumentFile ? 'Uploaded' : 'Required'}</span>
            </div>
            <div className={`flex items-center gap-2 ${
              insuranceIdDocumentFile ? 'text-green-600' : 'text-gray-400'
            }`}>
              <FaCheckCircle size={16} />
              <span>Insurance ID Document {insuranceIdDocumentFile ? 'Uploaded' : 'Required'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceDetailsPage;
