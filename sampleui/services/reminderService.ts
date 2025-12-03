/**
 * Reminder API Service
 * Handles patient reminders and upcoming appointments
 */

import axiosInstance from '../utils/axiosInstance';
import type { 
  UpcomingPatient, 
  SelectiveReminderRequest, 
  SelectiveReminderResponse 
} from '../utils/types';

export type { UpcomingPatient, SelectiveReminderRequest, SelectiveReminderResponse };

class ReminderService {
  /**
   * Get upcoming patients for reminders
   */
  async getUpcomingPatients(doctorId?: number): Promise<UpcomingPatient[]> {
    const url = doctorId 
      ? `/dashboard/reminders/patients/upcoming?doctor_id=${doctorId}`
      : `/dashboard/reminders/patients/upcoming`;
    
    const response = await axiosInstance.get<UpcomingPatient[]>(url);
    return response.data;
  }

  /**
   * Send reminders to selected patients
   */
  async sendReminders(request: SelectiveReminderRequest): Promise<SelectiveReminderResponse> {
    const response = await axiosInstance.post<SelectiveReminderResponse>(
      '/dashboard/reminders/send/patients',
      request
    );
    return response.data;
  }
}

// Export singleton instance
export const reminderService = new ReminderService();
export default reminderService;
