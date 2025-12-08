import { BaseAPI } from "../shared/base"
import type { Patient } from "../shared/types"

export class AdminPatientsAPI extends BaseAPI {
  /**
   * Get all patients (admin can see all)
   */
  static async getAllPatients(clinicId?: number): Promise<Patient[]> {
    const queryString = clinicId ? this.buildQueryString({ clinic_id: clinicId }) : ''
    const url = `${this.getBaseUrl()}/dashboard/patients${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)
    
    if (Array.isArray(data)) {
      return data
    } else if (data.patients && Array.isArray(data.patients)) {
      return data.patients
    }
    
    return []
  }

  /**
   * Get a specific patient by ID
   */
  static async getPatientById(patientId: number): Promise<Patient> {
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/patients/${patientId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    return this.handleResponse<Patient>(response)
  }

  /**
   * Create a new patient
   */
  static async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/patients/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData),
    })

    return this.handleResponse<Patient>(response)
  }

  /**
   * Update a patient
   */
  static async updatePatient(patientId: number, patientData: Partial<Patient>): Promise<Patient> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/patients/${patientId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patientData),
    })

    return this.handleResponse<Patient>(response)
  }

  /**
   * Delete a patient
   */
  static async deletePatient(patientId: number): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/dashboard/patients/${patientId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete patient: ${response.status}`)
    }
  }
}

