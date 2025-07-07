/*
  # Create quotes system

  1. New Tables
    - `quote_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'DV')
      - `year` (integer, current year)
      - `current_number` (integer, starts at 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quotes`
      - `id` (uuid, primary key)
      - `quote_number` (text, unique)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_address` (text)
      - `quote_date` (date)
      - `valid_until_date` (date)
      - `status` (text, default 'draft')
      - `subtotal_ht` (numeric)
      - `total_vat` (numeric)
      - `total_ttc` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quote_line_items`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key)
      - `product_id` (text)
      - `product_sku` (text)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price_ht` (numeric)
      - `total_ht` (numeric)
      - `vat_percentage` (numeric)
      - `vat_amount` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their quotes
*/

-- Create quote settings table
CREATE TABLE IF NOT EXISTS quote_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'DV',
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  quote_date date DEFAULT CURRENT_DATE,
  valid_until_date date,
  status text DEFAULT 'draft',
  subtotal_ht numeric(10,2) DEFAULT 0.00,
  total_vat numeric(10,2) DEFAULT 0.00,
  total_ttc numeric(10,2) DEFAULT 0.00,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote line items table
CREATE TABLE IF NOT EXISTS quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_sku text DEFAULT '',
  product_name text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price_ht numeric(10,2) DEFAULT 0.00,
  total_ht numeric(10,2) DEFAULT 0.00,
  vat_percentage numeric(5,2) DEFAULT 0.00,
  vat_amount numeric(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- Enable RLS
ALTER TABLE quote_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read quote settings" ON quote_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage quote settings" ON quote_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read quotes" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage quotes" ON quotes FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read quote line items" ON quote_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage quote line items" ON quote_line_items FOR ALL TO authenticated USING (true);