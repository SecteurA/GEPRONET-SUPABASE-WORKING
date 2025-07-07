/*
  # Create delivery notes tables

  1. New Tables
    - `delivery_note_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'BL')
      - `year` (integer)
      - `current_number` (integer, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `delivery_notes`
      - `id` (uuid, primary key)
      - `delivery_note_number` (text, unique)
      - `invoice_id` (uuid, references invoices)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_address` (text)
      - `delivery_date` (date)
      - `status` (text, default 'pending')
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `delivery_note_line_items`
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid, references delivery_notes)
      - `product_id` (text)
      - `product_sku` (text)
      - `product_name` (text)
      - `quantity` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
</*/

-- Create delivery note settings table
CREATE TABLE IF NOT EXISTS delivery_note_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'BL',
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  delivery_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery note line items table
CREATE TABLE IF NOT EXISTS delivery_note_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_sku text DEFAULT '',
  product_name text NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_number ON delivery_notes(delivery_note_number);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_note_line_items_delivery_note_id ON delivery_note_line_items(delivery_note_id);

-- Enable RLS
ALTER TABLE delivery_note_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read delivery note settings" ON delivery_note_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage delivery note settings" ON delivery_note_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read delivery notes" ON delivery_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage delivery notes" ON delivery_notes FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read delivery note line items" ON delivery_note_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage delivery note line items" ON delivery_note_line_items FOR ALL TO authenticated USING (true);