import { BaseAPI } from "../shared/base"
import type { Patient } from "../shared/types"

export class AdminPatientsAPI extends BaseAPI {
  /**
   * Get all patients (admin can see all)
   */
  static async getAllPatients(clinicId?: number): Promise<Patient[]> {
    const queryString = clinicId ? this.buildQueryString({ clinic_id: clinicId }) : ''
    const url = `${this.getBaseUrl()}/dashboard/patients${queryString ? `?${queryString}` : ''}`

    const data = await this.get<any>(url)
    
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
    return this.get<Patient>(`${this.getBaseUrl()}/dashboard/patients/${patientId}`)
  }

  /**
   * Create a new patient
   */
  static async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    return this.post<Patient>(`${this.getBaseUrl()}/dashboard/patients/create`, patientData)
  }

  /**
   * Update a patient
   */
  static async updatePatient(patientId: number, patientData: Partial<Patient>): Promise<Patient> {
    return this.put<Patient>(`${this.getBaseUrl()}/dashboard/patients/${patientId}`, patientData)
  }

  /**
   * Delete a patient
   */
  static async deletePatient(patientId: number): Promise<void> {
    await this.delete<void>(`${this.getBaseUrl()}/dashboard/patients/${patientId}`)
  }
}

