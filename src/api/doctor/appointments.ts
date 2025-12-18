import { BaseAPI } from "../shared/base"
import type {
  Appointment,
  AppointmentFilters,
  BookAppointmentRequest,
  RescheduleAppointmentRequest,
  CancelAppointmentRequest,
} from "../shared/types"

export class DoctorAppointmentsAPI extends BaseAPI {
  /**
   * Get all appointments for a doctor
   */
  static async getAllAppointments(filters?: AppointmentFilters): Promise<Appointment[]> {
    const queryString = this.buildQueryString(filters || {})
    const url = `${this.getBaseUrl()}/dashboard/appointments${queryString ? `?${queryString}` : ''}`

    const data = await this.get<any>(url)
    
    // Handle API response structure: { appointments: [...] } or directly an array
    if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.appointments)) {
      return data.appointments
    } else if (Array.isArray(data)) {
      return data
    }
    
    return []
  }

  /**
   * Get appointments for a specific patient
   */
  static async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/appointments/patient/${patientId}`)
    
    if (Array.isArray(data)) {
      return data
    } else if (data.appointments && Array.isArray(data.appointments)) {
      return data.appointments
    }
    
    return []
  }

  /**
   * Book a new appointment
   */
  static async bookAppointment(appointmentData: BookAppointmentRequest): Promise<Appointment> {
    return this.post<Appointment>(`${this.getBaseUrl()}/dashboard/appointments/book`, appointmentData)
  }

  /**
   * Reschedule an existing appointment
   */
  static async rescheduleAppointment(appointmentData: RescheduleAppointmentRequest): Promise<Appointment> {
    return this.post<Appointment>(`${this.getBaseUrl()}/dashboard/appointments/reschedule`, appointmentData)
  }

  /**
   * Cancel an appointment
   */
  static async cancelAppointment(appointmentData: CancelAppointmentRequest): Promise<any> {
    return this.post<any>(`${this.getBaseUrl()}/dashboard/appointments/cancel`, appointmentData)
  }

  /**
   * Get doctor availability
   */
  static async getDoctorAvailability(clinicId: number, doctorId: number, startDate: string, endDate: string): Promise<any> {
    return this.post<any>(`${this.getBaseUrl()}/dashboard/doctors/availability`, {
        clinic_id: clinicId,
        doctor_id: doctorId,
        start_date: startDate,
        end_date: endDate
    })
  }
}

