import { BaseAPI } from "../shared/base"
import { AuthStorage } from "../auth"
import type { CallLog, LogFilters, TranscriptTurn } from "../shared/types"

export class DoctorLogsAPI extends BaseAPI {
    /**
     * Get all call logs for a doctor/clinic using the clinic-specific endpoint
     */
    static async getLogs(filters?: LogFilters): Promise<CallLog[]> {
        // Get clinic ID from decoded JWT token
        const clinicId = AuthStorage.getClinicId()

        if (!clinicId) {
            console.warn('⚠️ No clinic ID found, cannot fetch logs')
            return []
        }

        // Build URL with clinic_id for the new by-clinic endpoint
        const baseParams: Record<string, any> = { clinic_id: clinicId }
        const allParams = { ...baseParams, ...(filters || {}) }
        const queryString = this.buildQueryString(allParams)
        const url = `${this.getBaseUrl()}/dashboard/logs/by-clinic${queryString ? `?${queryString}` : ''}`

        const data = await this.get<any>(url)

        let logs: CallLog[] = []
        if (Array.isArray(data)) {
            logs = data
        } else if (data.logs && Array.isArray(data.logs)) {
            logs = data.logs
        }

        // No need to filter on frontend anymore - backend handles it
        return logs
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

