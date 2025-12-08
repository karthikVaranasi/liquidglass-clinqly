import { BaseAPI } from "../shared/base"
import type { Doctor } from "../shared/types"

export class AdminDoctorsAPI extends BaseAPI {
  /**
   * Get all doctors
   */
  static async getAllDoctors(): Promise<Doctor[]> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/doctors`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)
    
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
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/doctors?clinic_id=${clinicId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    const data = await this.handleResponse<any>(response)
    
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
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/doctors/${doctorId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    return this.handleResponse<Doctor>(response)
  }

  /**
   * Create a new doctor
   */
  static async createDoctor(doctorData: Partial<Doctor>): Promise<Doctor> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/doctors`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doctorData),
    })

    return this.handleResponse<Doctor>(response)
  }

  /**
   * Update a doctor
   */
  static async updateDoctor(doctorId: number, doctorData: Partial<Doctor>): Promise<Doctor> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/doctors/${doctorId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doctorData),
    })

    return this.handleResponse<Doctor>(response)
  }

  /**
   * Delete a doctor
   */
  static async deleteDoctor(doctorId: number): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete doctor: ${response.status}`)
    }
  }
}

