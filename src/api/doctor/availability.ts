import { BaseAPI } from "../shared/base"
import type {
    ClinicWorkingHour,
    ClinicWorkingHoursRequest,
    ClinicWorkingHoursResponse,
    ClinicWorkingHoursGetResponse,
    AvailabilityException,
    CreateAvailabilityExceptionRequest,
    UpdateAvailabilityExceptionRequest,
} from "../shared/types"

/**
 * API service for clinic working hours and doctor availability exceptions
 */
export class AvailabilityAPI extends BaseAPI {

    // ============================================
    // Clinic Working Hours APIs
    // ============================================

    /**
     * Get clinic working hours
     * @param clinicId - The clinic ID
     */
    static async getClinicWorkingHours(clinicId: number): Promise<ClinicWorkingHoursGetResponse> {
        const queryString = this.buildQueryString({ clinic_id: clinicId })
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/clinics/clinic-working-hours?${queryString}`,
            {
                method: 'GET',
                headers: this.getAuthHeaders(),
            }
        )
        return this.handleResponse<ClinicWorkingHoursGetResponse>(response)
    }

    /**
     * Update clinic working hours
     * @param data - The clinic working hours data
     */
    static async updateClinicWorkingHours(data: ClinicWorkingHoursRequest): Promise<ClinicWorkingHoursResponse> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/clinics/clinic-working-hours`,
            {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data),
            }
        )
        return this.handleResponse<ClinicWorkingHoursResponse>(response)
    }

    // ============================================
    // Doctor Availability Exceptions APIs
    // ============================================

    /**
     * Get availability exceptions for a doctor
     * @param doctorId - Doctor's ID
     * @param startDate - Optional start date filter (YYYY-MM-DD)
     * @param endDate - Optional end date filter (YYYY-MM-DD)
     */
    static async getAvailabilityExceptions(
        doctorId: number,
        startDate?: string,
        endDate?: string
    ): Promise<AvailabilityException[]> {
        const params: Record<string, any> = {}
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate

        const queryString = this.buildQueryString(params)
        const url = `${this.getBaseUrl()}/dashboard/doctors/availability-exceptions/${doctorId}${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
        })
        return this.handleResponse<AvailabilityException[]>(response)
    }

    /**
     * Create a new availability exception
     * @param data - Exception creation data
     */
    static async createAvailabilityException(
        data: CreateAvailabilityExceptionRequest
    ): Promise<AvailabilityException> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/doctors/availability-exceptions`,
            {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data),
            }
        )
        return this.handleResponse<AvailabilityException>(response)
    }

    /**
     * Update an existing availability exception
     * @param exceptionId - Exception's ID
     * @param data - Exception update data
     */
    static async updateAvailabilityException(
        exceptionId: number,
        data: UpdateAvailabilityExceptionRequest
    ): Promise<AvailabilityException> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/doctors/availability-exceptions/${exceptionId}`,
            {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data),
            }
        )
        return this.handleResponse<AvailabilityException>(response)
    }

    /**
     * Delete an availability exception
     * @param exceptionId - Exception's ID
     */
    static async deleteAvailabilityException(exceptionId: number): Promise<string> {
        const response = await fetch(
            `${this.getBaseUrl()}/dashboard/doctors/availability-exceptions/${exceptionId}`,
            {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
            }
        )
        return this.handleResponse<string>(response)
    }

    /**
     * Sync US federal holidays as availability exceptions for a doctor
     * @param doctorId - Doctor's ID
     * @param year - Year to sync holidays for (defaults to current year)
     */
    static async syncHolidays(doctorId: number, year?: number): Promise<any> {
        const params: Record<string, any> = {}
        if (year) params.year = year

        const queryString = this.buildQueryString(params)
        const url = `${this.getBaseUrl()}/dashboard/doctors/${doctorId}/sync-holidays${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getAuthHeaders(),
        })
        return this.handleResponse<any>(response)
    }
}

// ============================================
// Time Format Utilities
// ============================================

type DayOfWeekFull = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
type DayOfWeekShort = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

const DAY_MAP: Record<DayOfWeekFull, DayOfWeekShort> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun',
}

const DAY_MAP_REVERSE: Record<DayOfWeekShort, DayOfWeekFull> = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday',
}

/**
 * Convert full day name to API short format
 */
export function dayToApiFormat(day: string): DayOfWeekShort {
    return DAY_MAP[day as DayOfWeekFull] || day as DayOfWeekShort
}

/**
 * Convert API short day format to full day name
 */
export function dayFromApiFormat(day: string): DayOfWeekFull {
    return DAY_MAP_REVERSE[day as DayOfWeekShort] || day as DayOfWeekFull
}

/**
 * Convert 12-hour time format (e.g., "9:00 AM") to ISO time format (e.g., "09:00:00.000Z")
 */
export function timeToApiFormat(time12h: string): string {
    // Parse "9:00 AM" or "12:30 PM" format
    const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return time12h

    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const period = match[3].toUpperCase()

    if (period === 'PM' && hours !== 12) {
        hours += 12
    } else if (period === 'AM' && hours === 12) {
        hours = 0
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}:00.000Z`
}

/**
 * Convert ISO time format (e.g., "09:00:00.000Z") to 12-hour format (e.g., "9:00 AM")
 */
export function timeFromApiFormat(isoTime: string): string {
    // Parse "09:00:00.000Z" or "14:30:00.000Z" format
    const match = isoTime.match(/^(\d{2}):(\d{2})/)
    if (!match) return isoTime

    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const period = hours >= 12 ? 'PM' : 'AM'

    if (hours > 12) {
        hours -= 12
    } else if (hours === 0) {
        hours = 12
    }

    return `${hours}:${minutes} ${period}`
}

/**
 * Convert local working hours format to API format
 */
export function workingHoursToApiFormat(
    localHours: Array<{ day: string; open: string; close: string; isClosed: boolean }>
): ClinicWorkingHour[] {
    return localHours.map((h) => ({
        day_of_week: dayToApiFormat(h.day),
        start_time: timeToApiFormat(h.open),
        end_time: timeToApiFormat(h.close),
        is_closed: h.isClosed,
    }))
}

/**
 * Convert API working hours format to local format
 * Always returns all 7 days, filling in missing days with defaults
 */
export function workingHoursFromApiFormat(
    apiHours: ClinicWorkingHour[]
): Array<{ day: string; open: string; close: string; isClosed: boolean }> {
    // Define the correct order of days
    const dayOrder: DayOfWeekShort[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Default values for days not in API response
    const defaultHours = {
        open: '9:00 AM',
        close: '5:00 PM',
        isClosed: true, // Missing days default to closed
    }

    // Create a map of API data for quick lookup
    const apiHoursMap = new Map<DayOfWeekShort, ClinicWorkingHour>()
    apiHours.forEach((h) => {
        apiHoursMap.set(h.day_of_week, h)
    })

    // Always return all 7 days
    return dayOrder.map((dayShort) => {
        const apiData = apiHoursMap.get(dayShort)

        if (apiData) {
            return {
                day: dayFromApiFormat(dayShort),
                open: timeFromApiFormat(apiData.start_time),
                close: timeFromApiFormat(apiData.end_time),
                isClosed: apiData.is_closed,
            }
        } else {
            // Day not in API response - use defaults
            return {
                day: dayFromApiFormat(dayShort),
                ...defaultHours,
            }
        }
    })
}

/**
 * Convert API date format (YYYY-MM-DD) to US display format (MM-DD-YYYY)
 */
export function dateToDisplayFormat(apiDate: string): string {
    if (!apiDate) return ''
    const parts = apiDate.split('-')
    if (parts.length !== 3) return apiDate
    const [yyyy, mm, dd] = parts
    return `${mm}-${dd}-${yyyy}`
}

/**
 * Convert US display date format (MM-DD-YYYY) to API format (YYYY-MM-DD)
 */
export function dateToApiFormat(displayDate: string): string {
    if (!displayDate) return ''
    const parts = displayDate.split('-')
    if (parts.length !== 3) return displayDate
    const [mm, dd, yyyy] = parts
    return `${yyyy}-${mm}-${dd}`
}
