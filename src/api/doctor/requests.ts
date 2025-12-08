import { BaseAPI } from "../shared/base"
import type { FrontDeskRequest, RefillRequest } from "../shared/types"

export class DoctorRequestsAPI extends BaseAPI {
  /**
   * Get front desk requests for a clinic
   */
  static async getFrontDeskRequests(clinicId: number): Promise<{ data: FrontDeskRequest[], count: number }> {
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/patients/requests/frontdesk/${clinicId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch front desk requests: ${response.status}`)
    }

    const data = await response.json()
    const requestsArray = Array.isArray(data) ? data : []
    
    return {
      data: requestsArray,
      count: requestsArray.length
    }
  }

  /**
   * Get refill requests for a clinic
   */
  static async getRefillRequests(clinicId: number): Promise<{ data: RefillRequest[], count: number }> {
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/patients/refill-requests?clinic_id=${clinicId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch refill requests: ${response.status}`)
    }

    const data = await response.json()
    
    // API can return { count: N, refill_requests: [...] } or { requests: [...] } or directly an array
    let requestsArray: RefillRequest[] = []
    let count = 0
    
    if (Array.isArray(data)) {
      requestsArray = data
      count = data.length
    } else if (data.requests && Array.isArray(data.requests)) {
      requestsArray = data.requests
      count = data.count ?? data.requests.length
    } else if (data.refill_requests && Array.isArray(data.refill_requests)) {
      requestsArray = data.refill_requests
      count = data.count ?? data.refill_requests.length
    }
    
    return {
      data: requestsArray,
      count: count
    }
  }
}

