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
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/calendar/status/google/${doctorId}`,
            {
                method: 'GET',
                headers: this.getAuthHeaders(),
            }
        )
        return this.handleResponse<CalendarStatus>(response)
    }

    /**
     * Get Microsoft Calendar connection status for a doctor
     */
    static async getMicrosoftStatus(doctorId: number): Promise<CalendarStatus> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/calendar/status/microsoft/${doctorId}`,
            {
                method: 'GET',
                headers: this.getAuthHeaders(),
            }
        )
        return this.handleResponse<CalendarStatus>(response)
    }

    /**
     * Get all calendar accounts for a doctor
     */
    static async getCalendarAccounts(doctorId: number): Promise<CalendarAccountsResponse> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/calendar/accounts/${doctorId}`,
            {
                method: 'GET',
                headers: this.getAuthHeaders(),
            }
        )
        return this.handleResponse<CalendarAccountsResponse>(response)
    }

    /**
     * Disconnect a calendar account
     */
    static async disconnectAccount(
        doctorId: number,
        accountId: number,
        provider: 'google' | 'microsoft'
    ): Promise<void> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/calendar/accounts/${provider}/${doctorId}/${accountId}`,
            {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
            }
        )
        await this.handleResponse<any>(response)
    }

    /**
     * Set a calendar account as primary
     */
    static async setPrimaryAccount(
        doctorId: number,
        accountId: number,
        provider: 'google' | 'microsoft'
    ): Promise<void> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/calendar/primary/${provider}/${doctorId}/${accountId}`,
            {
                method: 'PUT',
                headers: this.getAuthHeaders(),
            }
        )
        await this.handleResponse<any>(response)
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
