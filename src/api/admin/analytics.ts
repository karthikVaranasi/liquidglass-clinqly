import { BaseAPI } from "../shared/base"
import type {
  DashboardStats,
  AgeDistributionItem,
  AppointmentTrendItem
} from "../doctor/analytics"

export class AdminAnalyticsAPI extends BaseAPI {
  /**
   * Get all dashboard statistics for admin
   */
  static async getAllStats(): Promise<DashboardStats> {
    const url = `${this.getBaseUrl()}/dashboard/stats/all`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<{ stats: DashboardStats }>(response)
    return data.stats
  }

  /**
   * Get age distribution statistics for admin
   */
  static async getAgeDistribution(): Promise<AgeDistributionItem[]> {
    const url = `${this.getBaseUrl()}/dashboard/stats/age-distribution`

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
        '46-55': 'Mature (46-55)',
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
   * Get appointment trends for the current week for admin
   */
  static async getAppointmentTrends(): Promise<AppointmentTrendItem[]> {
    const url = `${this.getBaseUrl()}/dashboard/stats/appointment-trends`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const data = await this.handleResponse<{
      week_summary: any
      daily_breakdown: Array<{
        date: string
        day_name: string
        scheduled: number
        cancelled: number
      }>
      trends?: any[]
      appointment_trends?: any[]
    }>(response)

    // Transform API response to match chart format
    // API returns { week_summary: {...}, daily_breakdown: [...] }
    if (data.daily_breakdown && Array.isArray(data.daily_breakdown)) {
      return data.daily_breakdown.map((day) => ({
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
    } else if (data.appointment_trends && Array.isArray(data.appointment_trends)) {
      return data.appointment_trends.map((item: any) => ({
        day: item.day || item.day_name?.substring(0, 3) || 'Unknown',
        scheduled: item.scheduled || 0,
        cancelled: item.cancelled || 0
      }))
    }

    return []
  }
}





