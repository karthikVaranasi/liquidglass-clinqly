import { BaseAPI } from "../shared/base"
import type { CallLog, LogFilters, TranscriptTurn } from "../shared/types"

export class AdminLogsAPI extends BaseAPI {
  /**
   * Get all call logs for admin (across all clinics/doctors)
   */
  static async getLogs(filters?: LogFilters): Promise<CallLog[]> {
    const queryString = this.buildQueryString(filters || {})
    const url = `${this.getBaseUrl()}/dashboard/logs${queryString ? `?${queryString}` : ''}`

    const data = await this.get<any>(url)

    if (Array.isArray(data)) {
      return data
    } else if (data.logs && Array.isArray(data.logs)) {
      return data.logs
    }

    return []
  }

  /**
   * Get transcript (and optional audio) for a specific call log
   */
  static async getTranscript(logId: string): Promise<TranscriptTurn[] | { transcript: TranscriptTurn[]; audio?: string }> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/logs/transcript?id=${logId}`)

    const normalizeTranscript = (raw: any[]): TranscriptTurn[] =>
      raw
        .filter((turn: any) => turn && turn.message !== null)
        .map((turn: any) => ({
          speaker: turn.role === 'agent' ? 'A' : 'P',
          label: turn.role === 'agent' ? 'Assistant' : 'Patient',
          text: turn.message
        }))

    if (Array.isArray(data)) {
      return normalizeTranscript(data)
    }

    const rawTranscript = Array.isArray(data?.transcript) ? data.transcript : []
    const audio = data?.audio as string | undefined

    return {
      transcript: normalizeTranscript(rawTranscript),
      audio
    }
  }
}
