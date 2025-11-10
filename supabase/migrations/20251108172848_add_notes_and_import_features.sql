/*
  # Add Notes, Reschedule History, and Import Features

  1. New Tables
    - `service_notes` - Store multiple timestamped notes for each service
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key to services)
      - `note_text` (text)
      - `created_at` (timestamptz)
    
    - `reschedule_history` - Track all service reschedules
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key to services)
      - `original_date` (date)
      - `original_time` (time)
      - `new_date` (date)
      - `new_time` (time)
      - `reason` (text, optional)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `account_number` to services (optional, for CSV import)
    - Add `site_name` to services (optional, for CSV import)
    - Add `imported_from` to services (track import source)
    - Add `account_number` to recurring_clients

  3. Security
    - Enable RLS on new tables
    - Add public access policies for single-user app

  4. Indexes
    - Index on service_notes.service_id for fast lookups
    - Index on reschedule_history.service_id for fast lookups
*/

-- Add new columns to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE services ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'site_name'
  ) THEN
    ALTER TABLE services ADD COLUMN site_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'imported_from'
  ) THEN
    ALTER TABLE services ADD COLUMN imported_from text CHECK (imported_from IN ('csv', 'manual', NULL));
  END IF;
END $$;

-- Add account_number to recurring_clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_clients' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE recurring_clients ADD COLUMN account_number text;
  END IF;
END $$;

-- Create service_notes table
CREATE TABLE IF NOT EXISTS service_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_service_notes_service
    FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE CASCADE
);

-- Create reschedule_history table
CREATE TABLE IF NOT EXISTS reschedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  original_date date NOT NULL,
  original_time time NOT NULL,
  new_date date NOT NULL,
  new_time time NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_reschedule_history_service
    FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_notes_service_id ON service_notes(service_id);
CREATE INDEX IF NOT EXISTS idx_service_notes_created_at ON service_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_service_id ON reschedule_history(service_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_created_at ON reschedule_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE service_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user application)
CREATE POLICY "Allow all operations on service_notes"
  ON service_notes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on reschedule_history"
  ON reschedule_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
