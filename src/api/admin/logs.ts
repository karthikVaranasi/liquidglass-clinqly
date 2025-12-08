import { BaseAPI } from "../shared/base"
import type { CallLog, LogFilters, TranscriptTurn } from "../shared/types"

export class AdminLogsAPI extends BaseAPI {
  /**
   * Get all call logs for admin (across all clinics/doctors)
   */
  static async getLogs(filters?: LogFilters): Promise<CallLog[]> {
    const queryString = this.buildQueryString(filters || {})
    const url = `${this.getBaseUrl()}/dashboard/admin/logs${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)

    if (Array.isArray(data)) {
      return data
    } else if (data.logs && Array.isArray(data.logs)) {
      return data.logs
    }

    return []
  }

  /**
   * Get transcript for a specific call log
   */
  static async getTranscript(logId: string): Promise<TranscriptTurn[]> {
    const response = await fetch(
      `${this.getBaseUrl()}/dashboard/admin/logs/${logId}/transcript`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    const data = await this.handleResponse<any>(response)

    if (Array.isArray(data)) {
      return data
    } else if (data.transcript && Array.isArray(data.transcript)) {
      return data.transcript
    }

    return []
  }
}
