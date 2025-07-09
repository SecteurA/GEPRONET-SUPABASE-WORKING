/*
  # Create Cash Control System

  1. New Tables
    - `cash_control_settings` for numbering
    - `cash_controls` for daily cash closures

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create cash control settings table
CREATE TABLE IF NOT EXISTS cash_control_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'CC',
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cash controls table
CREATE TABLE IF NOT EXISTS cash_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_number text UNIQUE NOT NULL,
  control_date date NOT NULL,
  cash_total numeric(12,2) DEFAULT 0.00,
  transfer_total numeric(12,2) DEFAULT 0.00,
  total_amount numeric(12,2) DEFAULT 0.00,
  status text DEFAULT 'closed',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_controls ENABLE ROW LEVEL SECURITY;

-- Create policies for cash control settings
CREATE POLICY "Users can read cash control settings"
  ON cash_control_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage cash control settings"
  ON cash_control_settings
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for cash controls
CREATE POLICY "Users can read cash controls"
  ON cash_controls
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage cash controls"
  ON cash_controls
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_controls_date ON cash_controls(control_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_controls_number ON cash_controls(control_number);
CREATE INDEX IF NOT EXISTS idx_cash_controls_status ON cash_controls(status);

-- Create unique constraint on control_date to ensure one closure per day
ALTER TABLE cash_controls ADD CONSTRAINT unique_control_date UNIQUE (control_date);