/**
 * Axios instance with Bearer token authentication
 * Use this instance for all API calls that require authentication
 */

import axios from 'axios';
import { getAuthToken } from './auth';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No auth token found in localStorage. Request will be sent without authentication.');
      console.warn('Request URL:', config.url);
    }
    
    // If the data is FormData, remove the Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || '';
      const url = error.config?.url || '';
      
      // Check if this is an MFA-related error (don't redirect for MFA)
      const isMFARelated = 
        errorMessage.toLowerCase().includes('mfa') ||
        errorMessage.toLowerCase().includes('two-factor') ||
        errorMessage.toLowerCase().includes('2fa') ||
        errorMessage.toLowerCase().includes('verification code') ||
        errorMessage.toLowerCase().includes('invalid code') ||
        errorData?.mfa_required === true ||
        url.includes('/login-as-doctor') || // Login-as-doctor endpoint might require MFA
        url.includes('/dashboard/auth/admin/login') || // Login endpoint with MFA code
        url.includes('/dashboard/mfa/'); // MFA endpoints
      
      // Check if this is a login-as-doctor request that might need MFA
      const isLoginAsDoctor = url.includes('/login-as-doctor');
      
      // Don't redirect if it's MFA-related or login-as-doctor (let component handle it)
      if (!isMFARelated && !isLoginAsDoctor) {
        // Clear auth data and redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
      // If it's MFA-related, let the component handle the error
    }
    
    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

