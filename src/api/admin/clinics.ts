import { BaseAPI } from "../shared/base"

export interface Clinic {
  id: number
  name: string
  phone_number: string
  logo_url: string | null
  address: string
}

export class AdminClinicsAPI extends BaseAPI {
  /**
   * Get all clinics
   */
  static async getAllClinics(): Promise<Clinic[]> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/clinics`)

    if (data.clinics && Array.isArray(data.clinics)) {
      return data.clinics
    }

    return []
  }
}
