import { BaseAPI } from "../shared/base"

export interface DashboardStats {
  total_patients: number
  total_doctors?: number
  total_appointments: number
  todays_appointments: number
  upcoming_appointments: number
  recent_appointments?: any[]
}

export interface AgeDistributionItem {
  name: string
  value: number
  color: string
}

export interface AppointmentTrendItem {
  day: string
  scheduled: number
  cancelled: number
}

export interface DailyBreakdown {
  date: string
  day_name: string
  scheduled: number
  cancelled: number
}

export interface WeekSummary {
  week_start: string
  week_end: string
  total_scheduled: number
  total_cancelled: number
  net_appointments: number
}

export interface AnalyticsResponse {
  stats: DashboardStats
}

export interface AgeDistributionResponse {
  age_distribution?: AgeDistributionItem[]
  age_ranges?: any[]
}

export interface AppointmentTrendsResponse {
  week_summary: WeekSummary
  daily_breakdown: DailyBreakdown[]
  trends?: any[]
  appointment_trends?: any[]
}

export class DoctorAnalyticsAPI extends BaseAPI {
  /**
   * Get all dashboard statistics
   */
  static async getAllStats(clinicId?: number, doctorId?: number): Promise<DashboardStats> {
    const params: Record<string, any> = {}
    if (clinicId) params.clinic_id = clinicId
    if (doctorId) params.doctor_id = doctorId

    const queryString = this.buildQueryString(params)
    const url = `${this.getBaseUrl()}/dashboard/stats/all${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<AnalyticsResponse>(response)
    return data.stats
  }

  /**
   * Get age distribution statistics
   */
  static async getAgeDistribution(clinicId?: number, doctorId?: number): Promise<AgeDistributionItem[]> {
    const params: Record<string, any> = {}
    if (clinicId) params.clinic_id = clinicId
    if (doctorId) params.doctor_id = doctorId

    const queryString = this.buildQueryString(params)
    const url = `${this.getBaseUrl()}/dashboard/stats/age-distribution${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)

    // Default colors for age ranges
    const defaultColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe']

    // Transform API response to match chart format
    // API returns: { data: [{ age_group: "18-25", count: 18 }, ...] }
    let ageData: any[] = []

    if (data.data && Array.isArray(data.data)) {
      // Primary format: { data: [...] }
      ageData = data.data
    } else if (data.age_distribution && Array.isArray(data.age_distribution)) {
      // Fallback format: { age_distribution: [...] }
      ageData = data.age_distribution
    } else if (data.age_ranges && Array.isArray(data.age_ranges)) {
      // Fallback format: { age_ranges: [...] }
      ageData = data.age_ranges
    } else if (Array.isArray(data)) {
      // Direct array format
      ageData = data
    }

    if (ageData.length > 0) {
      // Map age groups to descriptive names
      const ageGroupMap: Record<string, string> = {
        '18-25': 'Young Adults (18-25)',
        '26-35': 'Adults (26-35)',
        '36-45': 'Middle Age (36-45)',
        '46-55': 'Middle Age (46-55)',
        '56-65': 'Senior (56-65)',
        '66-75': 'Senior (66-75)',
        '76+': 'Senior (76+)',
        'Unknown': 'Unknown'
      }

      return ageData.map((item: any, index: number) => {
        const ageGroup = item.age_group || item.age_range || item.name || item.label || 'Unknown'
        const displayName = ageGroupMap[ageGroup] || ageGroup

        return {
          name: displayName,
          value: item.count || item.value || item.patient_count || 0,
          color: item.color || defaultColors[index % defaultColors.length]
        }
      })
    }

    return []
  }

  /**
   * Get appointment trends for the current week
   */
  static async getAppointmentTrends(clinicId?: number, doctorId?: number): Promise<AppointmentTrendItem[]> {
    const params: Record<string, any> = {}
    if (clinicId) params.clinic_id = clinicId
    if (doctorId) params.doctor_id = doctorId

    const queryString = this.buildQueryString(params)
    const url = `${this.getBaseUrl()}/dashboard/stats/appointment-trends${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<AppointmentTrendsResponse>(response)

    // Transform API response to match chart format
    // API returns { week_summary: {...}, daily_breakdown: [...] }
    if (data.daily_breakdown && Array.isArray(data.daily_breakdown)) {
      return data.daily_breakdown.map((day: DailyBreakdown) => ({
        day: day.day_name ? day.day_name.substring(0, 3) : day.date || 'Unknown',
        scheduled: day.scheduled || 0,
        cancelled: day.cancelled || 0
      }))
    }

    // Fallback: Handle other possible response structures
    if (data.trends && Array.isArray(data.trends)) {
      return data.trends.map((item: any) => ({
        day: item.day || item.day_name?.substring(0, 3) || 'Unknown',
        scheduled: item.scheduled || 0,
        cancelled: item.cancelled || 0
      }))
    } else if (Array.isArray(data)) {
      return data.map((item: any) => ({
        day: item.day || item.day_name?.substring(0, 3) || 'Unknown',
        scheduled: item.scheduled || 0,
        cancelled: item.cancelled || 0
      }))
    } else if ((data as any).appointment_trends && Array.isArray((data as any).appointment_trends)) {
      return (data as any).appointment_trends.map((item: any) => ({
        day: item.day || item.day_name?.substring(0, 3) || 'Unknown',
        scheduled: item.scheduled || 0,
        cancelled: item.cancelled || 0
      }))
    }

    return []
  }

  /**
   * Get total logs count
   */
  static async getLogsCount(clinicId?: number, doctorId?: number): Promise<number> {
    const params: Record<string, any> = {}
    if (clinicId) params.clinic_id = clinicId
    if (doctorId) params.doctor_id = doctorId

    const queryString = this.buildQueryString(params)
    const url = `${this.getBaseUrl()}/dashboard/logs${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)

    // Handle different response structures
    if (Array.isArray(data)) {
      return data.length
    } else if (data.logs && Array.isArray(data.logs)) {
      return data.logs.length
    } else if (data.count !== undefined) {
      return data.count
    }

    return 0
  }
}

