export type WorkCategory = 'Field' | 'Mill' | 'Office'

export interface Profile {
  id: string
  email?: string
  employee_id: string
  full_name: string
  category?: WorkCategory
  role?: string
  status: string
  casual_leaves_balance: number
  sick_leaves_balance: number
  earned_leaves_balance: number
  working_days?: string[] | null
  second_saturday_off?: boolean | null
  created_at: string
  updated_at: string
}

export type Employee = Profile

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Not Marked'

export interface Attendance {
  id: string
  user_id: string
  category: WorkCategory
  check_in_time: string | null
  check_out_time: string | null
  location_lat: number | null
  location_lng: number | null
  status: AttendanceStatus
  late_minutes: number | null
  date: string
  created_at: string
  profiles?: Profile
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Earned Leave'
export type LeaveDuration = 'Half Day' | 'Full Day'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Leave {
  id: string
  user_id: string
  type: LeaveType
  duration: LeaveDuration
  reason: string
  status: LeaveStatus
  start_date: string
  end_date: string
  admin_note?: string
  created_at: string
  profiles?: Profile
}

export interface AttendanceSettings {
  id: string
  check_in_cutoff: string
  auto_logout_time: string
  working_days: string[]
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string
  action: string
  target_table: string
  target_id: string
  payload: Record<string, unknown>
  created_at: string
}

export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  notMarkedToday: number
  lateArrivalsToday: number
  pendingLeaves: number
}

export interface ReportFilters {
  userId?: string
  category?: WorkCategory | 'All'
  startDate: string
  endDate: string
}
