/*
  # Add End of Day Alert Settings

  1. Changes
    - Add `end_of_day_alert_enabled` column to settings (default: true)
    - Add `end_of_day_alert_hour` column to settings (default: 17 for 5 PM)
    - Add `auto_show_alert_on_open` column to settings (default: true)

  2. Security
    - No RLS changes needed (settings table already secured)
*/

-- Add end of day alert columns to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'end_of_day_alert_enabled'
  ) THEN
    ALTER TABLE settings ADD COLUMN end_of_day_alert_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'end_of_day_alert_hour'
  ) THEN
    ALTER TABLE settings ADD COLUMN end_of_day_alert_hour integer DEFAULT 17;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'auto_show_alert_on_open'
  ) THEN
    ALTER TABLE settings ADD COLUMN auto_show_alert_on_open boolean DEFAULT true;
  END IF;
END $$;

-- Update existing settings row if it exists
UPDATE settings
SET
  end_of_day_alert_enabled = COALESCE(end_of_day_alert_enabled, true),
  end_of_day_alert_hour = COALESCE(end_of_day_alert_hour, 17),
  auto_show_alert_on_open = COALESCE(auto_show_alert_on_open, true)
WHERE id IS NOT NULL;