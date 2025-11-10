/*
  # Maintenance Scheduler Database Schema

  ## Overview
  Complete database schema for industrial dishwasher maintenance scheduling application.
  Supports single technician managing 80-82 monthly visits with emergency rescheduling capabilities.

  ## Tables Created

  ### 1. services
  Main table storing all maintenance visits, emergencies, and service appointments
  - id: Unique identifier
  - type: Service type (scheduled_maintenance, emergency, recurring)
  - client_name: Customer/business name
  - dishwasher_model: Equipment model being serviced
  - service_date: Date of service
  - start_time: Service start time
  - duration_minutes: Expected duration in minutes
  - zone: Geographic area (north, south, east, west, downtown, other)
  - address: Service location
  - notes: Additional service notes
  - status: Current status (scheduled, in_progress, completed, rescheduled, canceled)
  - priority: Service priority (normal, urgent, emergency)
  - is_lunch_block: Flag for automatic lunch breaks
  - recurring_client_id: Link to recurring client template
  - rescheduled_from: Original date if rescheduled
  - rescheduled_reason: Reason for rescheduling
  - created_at, updated_at: Timestamps

  ### 2. recurring_clients
  Templates for clients with regular weekly/monthly maintenance schedules
  - id: Unique identifier
  - client_name: Customer name
  - dishwasher_model: Equipment model
  - day_of_week: Fixed day (0=Sunday to 6=Saturday)
  - preferred_time: Regular appointment time
  - duration_minutes: Typical service duration
  - zone: Service area
  - address: Location
  - frequency: Recurrence pattern (weekly, biweekly, monthly)
  - start_date: When recurrence begins
  - is_active: Whether currently generating visits
  - notes: Special instructions
  - created_at, updated_at: Timestamps

  ### 3. settings
  User preferences and configuration
  - id: Unique identifier
  - work_start_time: Default workday start
  - work_end_time: Default workday end
  - lunch_time: Default lunch break time
  - lunch_duration_minutes: Lunch duration (fixed at 60)
  - max_weekly_hours: Weekly hour limit (default 50)
  - max_daily_services: Daily service limit (default 4)
  - min_service_duration_minutes: Minimum service time
  - max_service_duration_minutes: Maximum service time
  - work_days: Array of working days
  - custom_zones: User-defined zones with colors
  - created_at, updated_at: Timestamps

  ## Security
  - RLS enabled on all tables
  - Public access policies for single-user application
  - All data owned by authenticated user in future multi-user version

  ## Important Notes
  - All times stored in time format for consistency
  - Dates stored separately for easy querying
  - Durations in minutes for precise calculations
  - Soft deletes not implemented (hard delete for simplicity)
  - Optimized indexes for common queries
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('scheduled_maintenance', 'emergency', 'recurring')),
  client_name text NOT NULL,
  dishwasher_model text NOT NULL,
  service_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 30 AND duration_minutes <= 300),
  zone text NOT NULL CHECK (zone IN ('north', 'south', 'east', 'west', 'downtown', 'other')),
  address text NOT NULL,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'rescheduled', 'canceled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  is_lunch_block boolean DEFAULT false,
  recurring_client_id uuid,
  rescheduled_from date,
  rescheduled_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recurring_clients table
CREATE TABLE IF NOT EXISTS recurring_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  dishwasher_model text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  preferred_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 30 AND duration_minutes <= 300),
  zone text NOT NULL CHECK (zone IN ('north', 'south', 'east', 'west', 'downtown', 'other')),
  address text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date date NOT NULL,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start_time time DEFAULT '07:00:00',
  work_end_time time DEFAULT '18:00:00',
  lunch_time time DEFAULT '12:00:00',
  lunch_duration_minutes integer DEFAULT 60,
  max_weekly_hours integer DEFAULT 50,
  max_daily_services integer DEFAULT 4,
  min_service_duration_minutes integer DEFAULT 30,
  max_service_duration_minutes integer DEFAULT 240,
  work_days jsonb DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
  custom_zones jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE services 
  ADD CONSTRAINT fk_recurring_client 
  FOREIGN KEY (recurring_client_id) 
  REFERENCES recurring_clients(id) 
  ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_date ON services(service_date);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_zone ON services(zone);
CREATE INDEX IF NOT EXISTS idx_services_client ON services(client_name);
CREATE INDEX IF NOT EXISTS idx_services_recurring ON services(recurring_client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_clients_active ON recurring_clients(is_active);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user application)
-- In production, these would be restricted to authenticated users

CREATE POLICY "Allow all operations on services"
  ON services
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on recurring_clients"
  ON recurring_clients
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on settings"
  ON settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_clients_updated_at ON recurring_clients;
CREATE TRIGGER update_recurring_clients_updated_at
  BEFORE UPDATE ON recurring_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();