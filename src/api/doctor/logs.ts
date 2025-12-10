import { BaseAPI } from "../shared/base"
import { AuthStorage } from "../auth"
import type { CallLog, LogFilters, TranscriptTurn } from "../shared/types"

export class DoctorLogsAPI extends BaseAPI {
    /**
     * Get all call logs for a doctor/clinic
     */
    static async getLogs(filters?: LogFilters): Promise<CallLog[]> {
        const queryString = this.buildQueryString(filters || {})
        const url = `${this.getBaseUrl()}/dashboard/logs${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        })

        const data = await this.handleResponse<any>(response)

        let logs: CallLog[] = []
        if (Array.isArray(data)) {
            logs = data
        } else if (data.logs && Array.isArray(data.logs)) {
            logs = data.logs
        }

        // Filter logs by clinic's phone number (to_phone must match clinic phone)
        const clinicData = AuthStorage.getClinicData()
        const clinicPhone = clinicData?.phone_number

        // console.log('🔍 Filtering logs by clinic phone:', clinicPhone)

        if (clinicPhone) {
            const filtered = logs.filter(log => log.to_phone === clinicPhone)
            // console.log(`📊 Filtered ${filtered.length} logs out of ${logs.length}`)
            return filtered
        }

        // console.log('⚠️ No clinic phone number found, returning all logs')
        return logs
    }

    /**
     * Get transcript for a specific call log
     */
    static async getTranscript(logId: string): Promise<TranscriptTurn[]> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/logs/transcript?id=${logId}`,
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
                .filter((turn: any) => turn.message !== null)
                .map((turn: any) => ({
                    speaker: turn.role === 'agent' ? 'A' : 'P',
                    label: turn.role === 'agent' ? 'Assistant' : 'Patient',
                    text: turn.message
                }))
        }

        return []
    }
}

