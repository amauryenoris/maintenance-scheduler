export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string
          type: 'scheduled_maintenance' | 'emergency' | 'recurring'
          client_name: string
          dishwasher_model: string
          service_date: string
          start_time: string
          duration_minutes: number
          zone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address: string
          notes: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'canceled'
          priority: 'normal' | 'urgent' | 'emergency'
          is_lunch_block: boolean
          recurring_client_id: string | null
          rescheduled_from: string | null
          rescheduled_reason: string | null
          account_number: string | null
          site_name: string | null
          imported_from: 'csv' | 'manual' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'scheduled_maintenance' | 'emergency' | 'recurring'
          client_name: string
          dishwasher_model: string
          service_date: string
          start_time: string
          duration_minutes: number
          zone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address: string
          notes?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'canceled'
          priority?: 'normal' | 'urgent' | 'emergency'
          is_lunch_block?: boolean
          recurring_client_id?: string | null
          rescheduled_from?: string | null
          rescheduled_reason?: string | null
          account_number?: string | null
          site_name?: string | null
          imported_from?: 'csv' | 'manual' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'scheduled_maintenance' | 'emergency' | 'recurring'
          client_name?: string
          dishwasher_model?: string
          service_date?: string
          start_time?: string
          duration_minutes?: number
          zone?: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address?: string
          notes?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'canceled'
          priority?: 'normal' | 'urgent' | 'emergency'
          is_lunch_block?: boolean
          recurring_client_id?: string | null
          rescheduled_from?: string | null
          rescheduled_reason?: string | null
          account_number?: string | null
          site_name?: string | null
          imported_from?: 'csv' | 'manual' | null
          created_at?: string
          updated_at?: string
        }
      }
      recurring_clients: {
        Row: {
          id: string
          client_name: string
          dishwasher_model: string
          day_of_week: number
          preferred_time: string
          duration_minutes: number
          zone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address: string
          frequency: 'weekly' | 'biweekly' | 'monthly'
          start_date: string
          is_active: boolean
          notes: string
          account_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_name: string
          dishwasher_model: string
          day_of_week: number
          preferred_time: string
          duration_minutes: number
          zone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address: string
          frequency: 'weekly' | 'biweekly' | 'monthly'
          start_date: string
          is_active?: boolean
          notes?: string
          account_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          dishwasher_model?: string
          day_of_week?: number
          preferred_time?: string
          duration_minutes?: number
          zone?: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other'
          address?: string
          frequency?: 'weekly' | 'biweekly' | 'monthly'
          start_date?: string
          is_active?: boolean
          notes?: string
          account_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_notes: {
        Row: {
          id: string
          service_id: string
          note_text: string
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          note_text: string
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          note_text?: string
          created_at?: string
        }
      }
      reschedule_history: {
        Row: {
          id: string
          service_id: string
          original_date: string
          original_time: string
          new_date: string
          new_time: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          original_date: string
          original_time: string
          new_date: string
          new_time: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          original_date?: string
          original_time?: string
          new_date?: string
          new_time?: string
          reason?: string | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          work_start_time: string
          work_end_time: string
          lunch_time: string
          lunch_duration_minutes: number
          max_weekly_hours: number
          max_daily_services: number
          min_service_duration_minutes: number
          max_service_duration_minutes: number
          work_days: Json
          custom_zones: Json
          end_of_day_alert_enabled: boolean
          end_of_day_alert_hour: number
          auto_show_alert_on_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_start_time?: string
          work_end_time?: string
          lunch_time?: string
          lunch_duration_minutes?: number
          max_weekly_hours?: number
          max_daily_services?: number
          min_service_duration_minutes?: number
          max_service_duration_minutes?: number
          work_days?: Json
          custom_zones?: Json
          end_of_day_alert_enabled?: boolean
          end_of_day_alert_hour?: number
          auto_show_alert_on_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_start_time?: string
          work_end_time?: string
          lunch_time?: string
          lunch_duration_minutes?: number
          max_weekly_hours?: number
          max_daily_services?: number
          min_service_duration_minutes?: number
          max_service_duration_minutes?: number
          work_days?: Json
          custom_zones?: Json
          end_of_day_alert_enabled?: boolean
          end_of_day_alert_hour?: number
          auto_show_alert_on_open?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];
export type ServiceUpdate = Database['public']['Tables']['services']['Update'];

export type RecurringClient = Database['public']['Tables']['recurring_clients']['Row'];
export type RecurringClientInsert = Database['public']['Tables']['recurring_clients']['Insert'];
export type RecurringClientUpdate = Database['public']['Tables']['recurring_clients']['Update'];

export type ServiceNote = Database['public']['Tables']['service_notes']['Row'];
export type ServiceNoteInsert = Database['public']['Tables']['service_notes']['Insert'];
export type ServiceNoteUpdate = Database['public']['Tables']['service_notes']['Update'];

export type RescheduleHistory = Database['public']['Tables']['reschedule_history']['Row'];
export type RescheduleHistoryInsert = Database['public']['Tables']['reschedule_history']['Insert'];
export type RescheduleHistoryUpdate = Database['public']['Tables']['reschedule_history']['Update'];

export type Settings = Database['public']['Tables']['settings']['Row'];
export type SettingsInsert = Database['public']['Tables']['settings']['Insert'];
export type SettingsUpdate = Database['public']['Tables']['settings']['Update'];
