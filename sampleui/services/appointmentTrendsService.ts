/**
 * Appointment Trends API Service
 * Handles appointment trends data fetching
 */

import axiosInstance from '../utils/axiosInstance';

export interface DailyBreakdown {
  date: string;
  day_name: string;
  scheduled: number;
  cancelled: number;
}

export interface WeekSummary {
  week_start: string;
  week_end: string;
  total_scheduled: number;
  total_cancelled: number;
  net_appointments: number;
}

export interface AppointmentTrendsResponse {
  week_summary: WeekSummary;
  daily_breakdown: DailyBreakdown[];
}

class AppointmentTrendsService {
  /**
   * Get appointment trends for the current week
   */
  async getAppointmentTrends(clinicId?: number, doctorId?: number): Promise<AppointmentTrendsResponse> {
    const params = new URLSearchParams();
    
    if (clinicId) {
      params.append('clinic_id', clinicId.toString());
    }
    
    if (doctorId) {
      params.append('doctor_id', doctorId.toString());
    }

    const url = `/dashboard/stats/appointment-trends${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await axiosInstance.get<AppointmentTrendsResponse>(url);
    return response.data;
  }

  /**
   * Transform API data to chart format
   */
  transformDataForChart(data: AppointmentTrendsResponse) {
    return data.daily_breakdown.map(day => ({
      day: day.day_name.substring(0, 3), // Convert "Monday" to "Mon"
      scheduled: day.scheduled,
      cancelled: day.cancelled,
      completed: day.scheduled - day.cancelled, // Calculate completed appointments
    }));
  }
}

// Export singleton instance
export const appointmentTrendsService = new AppointmentTrendsService();
export default appointmentTrendsService;
