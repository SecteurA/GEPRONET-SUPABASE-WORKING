/*
  # Create Return Notes System

  1. New Tables
    - `return_note_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'BR')
      - `year` (integer)
      - `current_number` (integer)
    - `return_notes`
      - `id` (uuid, primary key)  
      - `return_note_number` (text, unique)
      - `invoice_id` (uuid, references invoices)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_address` (text)
      - `return_date` (date)
      - `status` (text, default 'pending')
      - `reason` (text)
      - `notes` (text)
    - `return_note_line_items`
      - `id` (uuid, primary key)
      - `return_note_id` (uuid, references return_notes)
      - `product_id` (text)
      - `product_sku` (text)
      - `product_name` (text)
      - `quantity_returned` (integer)
      - `unit_price_ht` (numeric)
      - `total_ht` (numeric)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create return note settings table
CREATE TABLE IF NOT EXISTS return_note_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'BR',
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create return notes table
CREATE TABLE IF NOT EXISTS return_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_note_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  return_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  reason text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create return note line items table
CREATE TABLE IF NOT EXISTS return_note_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_note_id uuid NOT NULL REFERENCES return_notes(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_sku text DEFAULT '',
  product_name text NOT NULL,
  quantity_returned integer DEFAULT 1,
  unit_price_ht numeric(10,2) DEFAULT 0.00,
  total_ht numeric(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_return_notes_number ON return_notes(return_note_number);
CREATE INDEX IF NOT EXISTS idx_return_notes_invoice_id ON return_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_return_notes_date ON return_notes(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_return_notes_status ON return_notes(status);
CREATE INDEX IF NOT EXISTS idx_return_note_line_items_return_note_id ON return_note_line_items(return_note_id);

-- Enable RLS
ALTER TABLE return_note_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_note_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read return note settings" ON return_note_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage return note settings" ON return_note_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read return notes" ON return_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage return notes" ON return_notes FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read return note line items" ON return_note_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage return note line items" ON return_note_line_items FOR ALL TO authenticated USING (true);