import { BaseAPI } from "../shared/base"
import { AuthStorage } from "../auth"

// ============================================
// Calendar Types
// ============================================

export interface CalendarStatus {
    connected: boolean
    provider: string
    email: string | null
    expires_at: string | null
    message: string
}

export interface CalendarAccount {
    id: number
    provider: string
    provider_id: string
    email: string
    token_type: string
    expires_at: string
    created_at: string
    updated_at: string
    is_valid: boolean
    is_primary?: boolean
}

export interface CalendarAccountsResponse {
    doctor_id: number
    google_accounts: CalendarAccount[]
    microsoft_accounts: CalendarAccount[]
    total_accounts: number
}

// ============================================
// Calendar API Service
// ============================================

export class CalendarAPI extends BaseAPI {

    /**
     * Get Google Calendar connection status for a doctor
     */
    static async getGoogleStatus(doctorId: number): Promise<CalendarStatus> {
        return this.get<CalendarStatus>(`${this.getBaseUrl()}/dashboard/calendar/status/google/${doctorId}`)
    }

    /**
     * Get Microsoft Calendar connection status for a doctor
     */
    static async getMicrosoftStatus(doctorId: number): Promise<CalendarStatus> {
        return this.get<CalendarStatus>(`${this.getBaseUrl()}/dashboard/calendar/status/microsoft/${doctorId}`)
    }

    /**
     * Get all calendar accounts for a doctor
     */
    static async getCalendarAccounts(doctorId: number): Promise<CalendarAccountsResponse> {
        return this.get<CalendarAccountsResponse>(`${this.getBaseUrl()}/dashboard/calendar/accounts/${doctorId}`)
    }

    /**
     * Disconnect a calendar account
     */
    static async disconnectAccount(
        doctorId: number,
        accountId: number,
        provider: 'google' | 'microsoft'
    ): Promise<void> {
        await this.delete<any>(`${this.getBaseUrl()}/dashboard/calendar/accounts/${provider}/${doctorId}/${accountId}`)
    }

    /**
     * Set a calendar account as primary
     */
    static async setPrimaryAccount(
        doctorId: number,
        accountId: number,
        provider: 'google' | 'microsoft'
    ): Promise<void> {
        await this.put<any>(`${this.getBaseUrl()}/dashboard/calendar/primary/${provider}/${doctorId}/${accountId}`)
    }

    /**
     * Connect Google Calendar - redirects to OAuth flow
     */
    static connectGoogle(doctorId: number): void {
        const token = AuthStorage.getToken()
        if (!token) {
            console.error('No auth token found')
            return
        }
        const encodedToken = encodeURIComponent(token)
        window.location.href = `${this.getBaseUrl()}/dashboard/calendar/connect/google/${doctorId}?token=${encodedToken}`
    }

    /**
     * Connect Microsoft Calendar - redirects to OAuth flow
     */
    static connectMicrosoft(doctorId: number): void {
        const token = AuthStorage.getToken()
        if (!token) {
            console.error('No auth token found')
            return
        }
        const encodedToken = encodeURIComponent(token)
        window.location.href = `${this.getBaseUrl()}/dashboard/calendar/connect/microsoft/${doctorId}?token=${encodedToken}`
    }
}
