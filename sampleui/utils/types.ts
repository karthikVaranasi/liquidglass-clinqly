// Centralized type definitions for the clinic assistant application

export interface Guardian {
  id: number;
  clinic_id: number;
  first_name: string;
  last_name: string;
  dob: string;
  relationship_to_patient: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  dob: string;
  phone_number: string;
  clinic_id: number;
  status: string;
  doctor_id?: number;
  doctor_name?: string;
  department?: string;
  email?: string;
  gender?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;
  guardians: Guardian[];
}

export interface Appointment {
  appointment_id: number;
  patient_id?: number;
  doctor_id?: number;
  doctor_name: string;
  department: string;
  Sdate: string;
  Stime: string;
  status: string;
  duration_minutes: number;
  calendar_event_id?: string;
}

export interface APIAppointment {
  id: number;
  patient_id?: number;
  doctor_id?: number;
  doctor_name?: string;
  department?: string;
  appointment_time: string;
  date?: string;
  time?: string;
  status: string;
  duration?: number;
  duration_minutes?: number;
  calendar_event_id?: string;
}

// Form-related interfaces
export interface GuardianData {
  clinic_id: number;
  first_name: string;
  last_name: string;
  dob: string;
  relationship_to_patient: string;
}

export interface PatientCreateRequest {
  full_name: string;
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  doctor_id: number;
  clinic_id: number;
  guardian?: GuardianData;
}

// Dashboard-specific patient interface (API returns full_name instead of separated names)
export interface DashboardPatient {
  id: number;
  full_name: string;
  dob: string;
  phone_number: string;
  department: string;
}

// Today's Appointments specific interface
export interface TodayAppointment {
  appointment_id: number;
  appointment_time: string;
  patient_name: string;
  contact: string;
  type: string;
  status: string;
  patient_id: number;
  duration: number;
}

// Reminder service interfaces
export interface UpcomingPatient {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  phone_number: string;
  appointment_time: string;
  days_until: number;
  doctor_id: number;
  doctor_name: string;
  status: string;
}

export interface SelectiveReminderRequest {
  patient_appointment_ids: number[];
  doctor_id: number;
}

export interface SelectiveReminderResponse {
  status: string;
  message: string;
  timestamp: string;
  total_selected: number;
  reminders_sent: number;
  failed: number;
  details: {
    appointments_processed: number;
    valid_appointments: number;
    invalid_dates: number;
  };
}

// User management types
export type UserRole = 'admin' | 'doctor' | null;

export interface AdminData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  clinic_id: number;
  role?: string;
  [key: string]: unknown; // Allow for additional properties
}

export interface DoctorData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  clinic_id: number;
  department?: string;
  specialization?: string;
  is_admin_logged_as_doctor?: boolean;
  [key: string]: unknown; // Allow for additional properties
}

export interface ClinicData {
  id: number;
  name: string;
  phone_number: string;
  logo_url: string | null;
  address: string;
  created_at: string;
}

export interface User {
  authToken: string | null;
  userRole: UserRole;
  userData?: AdminData | DoctorData;
  clinicData?: ClinicData;
  userName?: string;
  userEmail?: string;
}

// API Response types
export interface ClinicApiResponse {
  id: number;
  name: string;
  phone_number: string;
  logo_url: string | null;
  address: string;
  created_at: string;
}

export interface DoctorApiResponse {
  id: number;
  name: string;
  department: string;
  email: string;
  clinic_id: number;
}

// Patient Documents interface
export interface PatientDocuments {
  patient_id: number;
  id_document_url: string | null;
  insurance_id_document_url: string | null;
  id: number;
  created_at: string;
  updated_at: string;
}

// Doctor Availability Exception interface
export interface AvailabilityException {
  id: number;
  doctor_id: number;
  exception_date: string; // YYYY-MM-DD format
  end_date?: string | null; // YYYY-MM-DD format (optional for date ranges)
  is_all_day: boolean;
  start_time?: string | null; // HH:mm:ssZ format (required if is_all_day=false)
  end_time?: string | null; // HH:mm:ssZ format (required if is_all_day=false)
  reason?: string | null;
  is_us_holiday?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

// Request interfaces for creating/updating exceptions
export interface CreateAvailabilityExceptionRequest {
  doctor_id: number;
  exception_date: string; // YYYY-MM-DD format
  end_date?: string | null;
  is_all_day: boolean;
  start_time?: string | null; // HH:mm:ssZ format
  end_time?: string | null; // HH:mm:ssZ format
  reason?: string | null;
}

export interface UpdateAvailabilityExceptionRequest {
  exception_date?: string | null;
  end_date?: string | null;
  is_all_day?: boolean | null;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
}

