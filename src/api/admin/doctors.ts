import { BaseAPI } from "../shared/base"
import type { Doctor } from "../shared/types"

export class AdminDoctorsAPI extends BaseAPI {
  /**
   * Get all doctors
   */
  static async getAllDoctors(): Promise<Doctor[]> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/doctors`)
    
    if (Array.isArray(data)) {
      return data
    } else if (data.doctors && Array.isArray(data.doctors)) {
      return data.doctors
    }
    
    return []
  }

  /**
   * Get doctors by clinic
   */
  static async getDoctorsByClinic(clinicId: number): Promise<Doctor[]> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/doctors?clinic_id=${clinicId}`)
    
    if (Array.isArray(data)) {
      return data
    } else if (data.doctors && Array.isArray(data.doctors)) {
      return data.doctors
    }
    
    return []
  }

  /**
   * Get a specific doctor by ID
   */
  static async getDoctorById(doctorId: number): Promise<Doctor> {
    return this.get<Doctor>(`${this.getBaseUrl()}/dashboard/doctors/${doctorId}`)
  }

  /**
   * Create a new doctor
   */
  static async createDoctor(doctorData: Partial<Doctor>): Promise<Doctor> {
    return this.post<Doctor>(`${this.getBaseUrl()}/dashboard/doctors`, doctorData)
  }

  /**
   * Update a doctor
   */
  static async updateDoctor(doctorId: number, doctorData: Partial<Doctor>): Promise<Doctor> {
    return this.put<Doctor>(`${this.getBaseUrl()}/dashboard/doctors/${doctorId}`, doctorData)
  }

  /**
   * Delete a doctor
   */
  static async deleteDoctor(doctorId: number): Promise<void> {
    await this.delete<void>(`${this.getBaseUrl()}/dashboard/doctors/${doctorId}`)
  }
}

