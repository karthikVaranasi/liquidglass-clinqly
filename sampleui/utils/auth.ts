/**
 * Authentication utility functions for managing user authentication state
 * Now integrated with Zustand store for state management
 */

import { useUserStore } from '../stores/useUserStore';

/**
 * Set the authentication token in localStorage and Zustand store
 */
export const setAuthToken = (token: string): void => {
  console.log('✅ Setting auth token in localStorage and Zustand');
  useUserStore.getState().setAuthToken(token);
};

/**
 * Get the authentication token from Zustand store
 */
export const getAuthToken = (): string | null => {
  const token = useUserStore.getState().authToken;
  if (!token) {
    console.warn('⚠️ No auth token found when getAuthToken() was called');
  }
  return token;
};

/**
 * Remove the authentication token from localStorage and Zustand store
 */
export const removeAuthToken = (): void => {
  useUserStore.getState().logout();
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return useUserStore.getState().isAuthenticated();
};

/**
 * Clear all authentication data from localStorage and Zustand store
 */
export const clearAuth = (): void => {
  console.log('🧹 Clearing all authentication data');
  useUserStore.getState().logout();
};

/**
 * Get authorization headers with Bearer token for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

