// Common types used across doctor and admin APIs

export interface ApiResponse<T> {
  data: T
  count?: number
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Appointment {
  id: number
  clinic_id: number
  doctor_id: number
  patient_id: number
  appointment_date: string
  appointment_time: string
  status: string
  phone?: string
  patient?: Patient
  doctor?: Doctor
}

export interface Patient {
  id: number
  first_name: string
  last_name: string
  dob: string
  phone_number: string
  email?: string
  clinic_id?: number
  status?: string
}

export interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  department?: string
  clinic_id: number
  status?: string
}

export interface FrontDeskRequest {
  id: number
  clinic_id: number
  name: string
  phone_number: string
  message: string
  created_at: string
}

export interface RefillRequest {
  id: number
  clinic_id: number
  patient_id: number
  caller_name: string
  relationship_to_patient?: string
  request: string
  pharmacy_name?: string
  pharmacy_location?: string
  created_at?: string
  patient?: Patient
}

export interface AppointmentFilters {
  doctor_id?: number
  clinic_id?: number
  status?: string
  date?: string
}

export interface BookAppointmentRequest {
  clinic_id: number
  doctor_id: number
  patient_id: number
  date?: string
  time: string
  phone?: string
}

export interface RescheduleAppointmentRequest {
  appointment_id: number
  clinic_id: number
  doctor_id: number
  patient_id: number
  date: string
  time: string
  phone?: string
}

export interface CancelAppointmentRequest {
  clinic_id: number
  doctor_id: number
  patient_id: number
  appointment_id: number
  phone?: string
}


export interface CallLog {
  call_id: string
  from_phone: string
  to_phone: string
  start_time: string
  end_time: string
  agent_type: string
  status: string
  id: number
  sentiment_score: number | null
}

export interface TranscriptTurn {
  speaker: "A" | "P"
  label: "Assistant" | "Patient"
  text: string
  timestamp?: string
}

export interface LogFilters {
  status?: string
  timeRange?: string
  search?: string
  page?: number
  limit?: number
}

// ============================================
// Clinic Working Hours Types
// ============================================

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface ClinicWorkingHour {
  day_of_week: DayOfWeek
  start_time: string  // ISO time format (e.g., "09:00:00.000Z")
  end_time: string    // ISO time format
  is_closed: boolean
}

export interface ClinicWorkingHoursRequest {
  clinic_id: number
  working_hours: ClinicWorkingHour[]
}

export interface ClinicWorkingHoursResponse {
  message: string
  clinic_id: number
  updated_days: string[]
}

export interface ClinicWorkingHoursGetResponse {
  clinic_id: number
  working_hours: ClinicWorkingHour[]
}

// ============================================
// Doctor Availability Exception Types
// ============================================

export interface AvailabilityException {
  id: number
  doctor_id: number
  exception_date: string  // YYYY-MM-DD
  end_date?: string | null
  is_all_day: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
  is_us_holiday?: boolean
  created_at: string
  updated_at?: string | null
}

export interface CreateAvailabilityExceptionRequest {
  doctor_id: number
  exception_date: string  // YYYY-MM-DD
  end_date?: string | null
  is_all_day: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
  is_us_holiday?: boolean
}

export interface UpdateAvailabilityExceptionRequest {
  exception_date?: string
  end_date?: string | null
  is_all_day?: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
}

export interface SyncHolidaysResponse {
  message: string
  holidays_synced: number
  holidays: AvailabilityException[]
}
