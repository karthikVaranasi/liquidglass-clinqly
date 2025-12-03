import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';
import type { GuardianData, PatientCreateRequest, DoctorData } from '../utils/types';
import axiosInstance from '../utils/axiosInstance';
import { useUserStore } from '../stores/useUserStore';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdded: () => void;
}

interface FormData {
  full_name: string;
  dob: string;
  phone: string;
  countryCode: string;
  selectedCountry: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_dob: string;
  relationship_to_patient: string;
}

interface ValidationErrors {
  full_name?: string;
  dob?: string;
  phone?: string;
  guardian_first_name?: string;
  guardian_last_name?: string;
  guardian_dob?: string;
  relationship_to_patient?: string;
  general?: string;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onPatientAdded }) => {
  // Country codes data with flag emojis
  const countryCodes = [
    { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
    { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
    { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
    { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
    { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
    { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
    { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
    { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
    { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
    { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
    { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
    { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
    { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
    { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
    { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
    { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Austria' },
    { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgium' },
    { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal' },
    { code: '+353', country: 'IE', flag: '🇮🇪', name: 'Ireland' },
    { code: '+30', country: 'GR', flag: '🇬🇷', name: 'Greece' },
    { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Poland' },
    { code: '+420', country: 'CZ', flag: '🇨🇿', name: 'Czech Republic' },
    { code: '+36', country: 'HU', flag: '🇭🇺', name: 'Hungary' },
    { code: '+380', country: 'UA', flag: '🇺🇦', name: 'Ukraine' },
    { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
    { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkey' },
    { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
    { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
    { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56', country: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: '+57', country: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+58', country: 'VE', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+51', country: 'PE', flag: '🇵🇪', name: 'Peru' },
    { code: '+593', country: 'EC', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+595', country: 'PY', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+598', country: 'UY', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+591', country: 'BO', flag: '🇧🇴', name: 'Bolivia' },
    { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
    { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
    { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
    { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
    { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
    { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
    { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
    { code: '+852', country: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
    { code: '+886', country: 'TW', flag: '🇹🇼', name: 'Taiwan' }
  ];

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    dob: '',
    phone: '',
    countryCode: '+1',
    selectedCountry: 'US',
    guardian_first_name: '',
    guardian_last_name: '',
    guardian_dob: '',
    relationship_to_patient: ''
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [showGuardianSection, setShowGuardianSection] = useState(false);
  const { userData, userRole } = useUserStore();

  // Simple toast function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg transition-all duration-300 transform translate-x-full ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        full_name: '',
        dob: '',
        phone: '',
        countryCode: '+1',
        selectedCountry: 'US',
        guardian_first_name: '',
        guardian_last_name: '',
        guardian_dob: '',
        relationship_to_patient: ''
      });
      setErrors({});
      setIsMinor(false);
      setShowGuardianSection(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.full_name.trim())) {
      newErrors.full_name = 'Full name can only contain letters and spaces';
    } else {
      const nameParts = formData.full_name.trim().split(/\s+/);
      if (nameParts.length < 2) {
        newErrors.full_name = 'Please enter both first and last name';
      }
    }

    // Date of birth validation
    let patientAge = 0;
    if (!formData.dob.trim()) {
      newErrors.dob = 'Date of birth is required';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      patientAge = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        patientAge--;
      }
      
      if (isNaN(dobDate.getTime())) {
        newErrors.dob = 'Please enter a valid date';
      } else if (dobDate > today) {
        newErrors.dob = 'Date of birth cannot be in the future';
      } else if (patientAge > 120) {
        newErrors.dob = 'Please enter a valid date of birth (age cannot exceed 120 years)';
      } else if (patientAge < 0) {
        newErrors.dob = 'Date of birth cannot be in the future';
      }
    }

    // Phone number validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^[1-9][\d]{0,15}$/;
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number';
      } else if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        newErrors.phone = 'Phone number must be between 7 and 15 digits';
      }
    }

    // Check if guardian information is provided
    const hasAnyGuardianInfo = formData.guardian_first_name.trim() || 
                                formData.guardian_last_name.trim() || 
                                formData.guardian_dob.trim() || 
                                formData.relationship_to_patient.trim();

    // Guardian validation - required for minors (under 18) or if any guardian field is filled
    const isMinor = patientAge < 18;
    
    if (isMinor || hasAnyGuardianInfo) {
      // First name validation
      if (!formData.guardian_first_name.trim()) {
        newErrors.guardian_first_name = isMinor ? 'Guardian first name is required for minors' : 'Guardian first name is required';
      } else if (formData.guardian_first_name.trim().length < 2) {
        newErrors.guardian_first_name = 'First name must be at least 2 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(formData.guardian_first_name.trim())) {
        newErrors.guardian_first_name = 'First name can only contain letters and spaces';
      }

      // Last name validation
      if (!formData.guardian_last_name.trim()) {
        newErrors.guardian_last_name = isMinor ? 'Guardian last name is required for minors' : 'Guardian last name is required';
      } else if (formData.guardian_last_name.trim().length < 2) {
        newErrors.guardian_last_name = 'Last name must be at least 2 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(formData.guardian_last_name.trim())) {
        newErrors.guardian_last_name = 'Last name can only contain letters and spaces';
      }

      // Date of birth validation
      if (!formData.guardian_dob.trim()) {
        newErrors.guardian_dob = isMinor ? 'Guardian date of birth is required for minors' : 'Guardian date of birth is required';
      } else {
        const guardianDobDate = new Date(formData.guardian_dob);
        const today = new Date();
        const guardianAge = today.getFullYear() - guardianDobDate.getFullYear();
        
        if (isNaN(guardianDobDate.getTime())) {
          newErrors.guardian_dob = 'Please enter a valid date';
        } else if (guardianDobDate > today) {
          newErrors.guardian_dob = 'Date of birth cannot be in the future';
        } else if (guardianAge < 18) {
          newErrors.guardian_dob = 'Guardian must be at least 18 years old';
        } else if (guardianAge > 120) {
          newErrors.guardian_dob = 'Please enter a valid date of birth';
        }
      }

      // Relationship validation
      if (!formData.relationship_to_patient.trim()) {
        newErrors.relationship_to_patient = isMinor ? 'Relationship to patient is required for minors' : 'Relationship to patient is required';
      } else if (formData.relationship_to_patient.trim().length < 2) {
        newErrors.relationship_to_patient = 'Relationship must be at least 2 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to check if patient is a minor based on DOB
  const checkIfMinor = (dob: string): boolean => {
    if (!dob) return false;
    
    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    
    return age < 18;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check if DOB changed and update minor status
    if (name === 'dob') {
      const minor = checkIfMinor(value);
      setIsMinor(minor);
      setShowGuardianSection(minor);
    }
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleCountrySelect = (countryCode: string, country: string) => {
    setFormData(prev => ({
      ...prev,
      countryCode,
      selectedCountry: country
    }));
    setIsCountryDropdownOpen(false);
    
    // Clear phone error when country changes
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: undefined
      }));
    }
  };

  const getSelectedCountry = () => {
    return countryCodes.find(c => c.code === formData.countryCode && c.country === formData.selectedCountry) || 
           countryCodes.find(c => c.code === formData.countryCode) || 
           countryCodes[0];
  };

  const filteredCountries = countryCodes.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.includes(searchQuery) ||
    country.flag.includes(searchQuery)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.country-selector')) {
        setIsCountryDropdownOpen(false);
      }
    };

    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!userData || userRole !== 'doctor') {
      setErrors({ general: 'Doctor data not found. Please log in again.' });
      return;
    }

    const doctor = userData as DoctorData;

    try {
      setIsLoading(true);
      setErrors({});
      
      const nameParts = formData.full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Prepare guardian data if provided
      const hasGuardianInfo = formData.guardian_first_name.trim() || 
                               formData.guardian_last_name.trim() || 
                               formData.guardian_dob.trim() || 
                               formData.relationship_to_patient.trim();

      const requestData: PatientCreateRequest = {
        full_name: formData.full_name.trim(),
        first_name: firstName,
        last_name: lastName,
        dob: formData.dob,
        phone: formData.countryCode + formData.phone.replace(/[\s\-()]/g, ''),
        doctor_id: doctor.id,
        clinic_id: doctor.clinic_id
      };

      // Add guardian data if provided
      if (hasGuardianInfo) {
        requestData.guardian = {
          clinic_id: doctor.clinic_id,
          first_name: formData.guardian_first_name.trim(),
          last_name: formData.guardian_last_name.trim(),
          dob: formData.guardian_dob,
          relationship_to_patient: formData.relationship_to_patient.trim()
        };
      }

      const response = await axiosInstance.post('/dashboard/patients/create', requestData);

      if (response.status === 201 || response.status === 200) {
        onPatientAdded();
        onClose();
        const message = response.data?.message || 'Patient added successfully!';
        showToast(message, 'success');
      }
    } catch (error: unknown) {
      console.error('Error creating patient:', error);
      
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        setErrors({ general: axiosError.response.data.error });
      } else {
        setErrors({ general: 'Failed to create patient. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaUserPlus className="text-[#098289] text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Patient</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                errors.full_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
              disabled={isLoading}
            />
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                errors.dob ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.dob && (
              <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <div className="flex gap-2">
              {/* Country Code Selector */}
              <div className="relative country-selector">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] bg-white hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  <span className="text-lg">{getSelectedCountry().flag}</span>
                  <span className="text-sm font-medium">{getSelectedCountry().code}</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isCountryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-10">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#098289]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCountries.map((country) => (
                        <button
                          key={`${country.code}-${country.country}`}
                          type="button"
                          onClick={() => handleCountrySelect(country.code, country.country)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
                        >
                          <span className="text-lg">{country.flag}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{country.name}</div>
                            <div className="text-xs text-gray-500">{country.code}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phone Number Input */}
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
                disabled={isLoading}
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Guardian Information Section */}
          {(showGuardianSection || formData.guardian_first_name || formData.guardian_last_name || formData.guardian_dob || formData.relationship_to_patient) && (
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-gray-900">
                  Guardian Information
                  {isMinor && (
                    <span className="text-xs font-normal text-red-600 ml-2">* Required (Patient is a minor)</span>
                  )}
                  {!isMinor && (
                    <span className="text-xs font-normal text-gray-500 ml-2">(Optional)</span>
                  )}
                </h3>
                {!isMinor && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGuardianSection(false);
                      setFormData(prev => ({
                        ...prev,
                        guardian_first_name: '',
                        guardian_last_name: '',
                        guardian_dob: '',
                        relationship_to_patient: ''
                      }));
                      setErrors(prev => ({
                        ...prev,
                        guardian_first_name: undefined,
                        guardian_last_name: undefined,
                        guardian_dob: undefined,
                        relationship_to_patient: undefined
                      }));
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>

            {/* Guardian First Name */}
            <div className="mb-4">
              <label htmlFor="guardian_first_name" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian First Name
              </label>
              <input
                type="text"
                id="guardian_first_name"
                name="guardian_first_name"
                value={formData.guardian_first_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                  errors.guardian_first_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter guardian first name"
                disabled={isLoading}
              />
              {errors.guardian_first_name && (
                <p className="text-red-500 text-xs mt-1">{errors.guardian_first_name}</p>
              )}
            </div>

            {/* Guardian Last Name */}
            <div className="mb-4">
              <label htmlFor="guardian_last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Last Name
              </label>
              <input
                type="text"
                id="guardian_last_name"
                name="guardian_last_name"
                value={formData.guardian_last_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                  errors.guardian_last_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter guardian last name"
                disabled={isLoading}
              />
              {errors.guardian_last_name && (
                <p className="text-red-500 text-xs mt-1">{errors.guardian_last_name}</p>
              )}
            </div>

            {/* Guardian Date of Birth */}
            <div className="mb-4">
              <label htmlFor="guardian_dob" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Date of Birth
              </label>
              <input
                type="date"
                id="guardian_dob"
                name="guardian_dob"
                value={formData.guardian_dob}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                  errors.guardian_dob ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.guardian_dob && (
                <p className="text-red-500 text-xs mt-1">{errors.guardian_dob}</p>
              )}
            </div>

            {/* Relationship to Patient */}
            <div className="mb-4">
              <label htmlFor="relationship_to_patient" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship to Patient
              </label>
              <input
                type="text"
                id="relationship_to_patient"
                name="relationship_to_patient"
                value={formData.relationship_to_patient}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                  errors.relationship_to_patient ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Parent, Guardian, Spouse"
                disabled={isLoading}
              />
              {errors.relationship_to_patient && (
                <p className="text-red-500 text-xs mt-1">{errors.relationship_to_patient}</p>
              )}
            </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-[#098289] border border-[#098289] rounded-md hover:bg-[#076d73] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isLoading || isValidating}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking...
                </>
              ) : (
                'Add Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal; 