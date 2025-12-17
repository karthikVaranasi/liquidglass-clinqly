import { BaseAPI } from "../shared/base"

// Response types for MFA API
export interface MFASetupResponse {
    secret: string
    qr_code: string
}

export interface MFAVerifyRequest {
    code: string
    secret: string
}

export interface MFAVerifyResponse {
    success: boolean
    message: string
    admin?: Record<string, any>
}

export interface MFAStatusResponse {
    mfa_enabled: boolean
}

/**
 * Admin MFA API service
 * Handles all MFA-related operations for admin users
 */
export class AdminMFAAPI extends BaseAPI {
    /**
     * Initiate MFA setup
     * GET /dashboard/mfa/setup
     * Returns QR code and secret for MFA setup
     */
    static async setupMFA(): Promise<MFASetupResponse> {
        const url = `${this.getBaseUrl()}/dashboard/mfa/setup`

        return this.get<MFASetupResponse>(url)
    }

    /**
     * Verify MFA code and enable MFA
     * POST /dashboard/mfa/verify
     * @param code - 6-digit verification code from authenticator app
     * @param secret - Secret key from setup
     */
    static async verifyMFA(code: string, secret: string): Promise<MFAVerifyResponse> {
        const url = `${this.getBaseUrl()}/dashboard/mfa/verify`

        return this.post<MFAVerifyResponse>(url, { code, secret }, 'login')
    }

    /**
     * Get current MFA status
     * GET /dashboard/mfa/status
     */
    static async getMFAStatus(): Promise<MFAStatusResponse> {
        const url = `${this.getBaseUrl()}/dashboard/mfa/status`

        return this.get<MFAStatusResponse>(url)
    }

    /**
     * Disable MFA for the current admin user
     * POST /dashboard/mfa/disable
     */
    static async disableMFA(): Promise<string> {
        const url = `${this.getBaseUrl()}/dashboard/mfa/disable`

        return this.post<string>(url)
    }
}
