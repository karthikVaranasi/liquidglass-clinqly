/**
 * Calendar API Service
 * Handles calendar status and connection
 */

import axiosInstance from '../utils/axiosInstance';

export interface CalendarStatus {
  connected: boolean;
  provider: string;
  email: string | null;
  expires_at: string | null;
  message: string;
}

export interface CalendarAccount {
  id: number;
  provider: string;
  provider_id: string;
  email: string;
  token_type: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  is_valid: boolean;
  is_primary?: boolean;
}

export interface CalendarAccountsResponse {
  doctor_id: number;
  google_accounts: CalendarAccount[];
  microsoft_accounts: CalendarAccount[];
  total_accounts: number;
}

class CalendarService {
  /**
   * Get Google Calendar status
   */
  async getGoogleStatus(doctorId: number): Promise<CalendarStatus> {
    const response = await axiosInstance.get<CalendarStatus>(
      `/dashboard/calendar/status/google/${doctorId}`
    );
    return response.data;
  }

  /**
   * Get Microsoft Calendar status
   */
  async getMicrosoftStatus(doctorId: number): Promise<CalendarStatus> {
    const response = await axiosInstance.get<CalendarStatus>(
      `/dashboard/calendar/status/microsoft/${doctorId}`
    );
    return response.data;
  }

  /**
   * Connect Google Calendar
   */
  connectGoogle(doctorId: number): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const encodedToken = encodeURIComponent(token);
    window.location.href = `${baseUrl}/dashboard/calendar/connect/google/${doctorId}?token=${encodedToken}`;
  }

  /**
   * Connect Microsoft Calendar
   */
  connectMicrosoft(doctorId: number): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const encodedToken = encodeURIComponent(token);
    window.location.href = `${baseUrl}/dashboard/calendar/connect/microsoft/${doctorId}?token=${encodedToken}`;
  }

  /**
   * Get all calendar accounts for a doctor
   */
  async getCalendarAccounts(doctorId: number): Promise<CalendarAccountsResponse> {
    const response = await axiosInstance.get<CalendarAccountsResponse>(
      `/dashboard/calendar/accounts/${doctorId}`
    );
    return response.data;
  }

  /**
   * Disconnect a calendar account
   */
  async disconnectAccount(doctorId: number, accountId: number, provider: 'google' | 'microsoft'): Promise<void> {
    await axiosInstance.delete(
      `/dashboard/calendar/accounts/${provider}/${doctorId}/${accountId}`
    );
  }

  /**
   * Set a calendar account as primary
   */
  async setPrimaryAccount(doctorId: number, accountId: number, provider: 'google' | 'microsoft'): Promise<void> {
    await axiosInstance.put(
      `/dashboard/calendar/primary/${provider}/${doctorId}/${accountId}`
    );
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
export default calendarService;
