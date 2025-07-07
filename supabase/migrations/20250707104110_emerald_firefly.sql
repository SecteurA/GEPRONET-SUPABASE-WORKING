/*
  # Create Sales Journal (Journal de vente) tables

  1. New Tables
    - `sales_journal_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'FG')
      - `year` (integer)
      - `current_number` (integer, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `sales_journals`
      - `id` (uuid, primary key)
      - `journal_number` (text, unique)
      - `journal_date` (date)
      - `total_ht` (numeric)
      - `total_vat` (numeric)
      - `total_ttc` (numeric)
      - `status` (text, default 'draft')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `sales_journal_line_items`
      - `id` (uuid, primary key)
      - `journal_id` (uuid, foreign key)
      - `order_id` (text)
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
    - Add policies for authenticated users
</deno>

-- Create sales journal settings table
CREATE TABLE IF NOT EXISTS sales_journal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'FG'::text,
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales journals table
CREATE TABLE IF NOT EXISTS sales_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number text UNIQUE NOT NULL,
  journal_date date NOT NULL,
  total_ht numeric(12,2) DEFAULT 0.00,
  total_vat numeric(12,2) DEFAULT 0.00,
  total_ttc numeric(12,2) DEFAULT 0.00,
  status text DEFAULT 'draft'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales journal line items table
CREATE TABLE IF NOT EXISTS sales_journal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES sales_journals(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  product_id text NOT NULL,
  product_sku text DEFAULT ''::text,
  product_name text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price_ht numeric(10,2) DEFAULT 0.00,
  total_ht numeric(10,2) DEFAULT 0.00,
  vat_percentage numeric(5,2) DEFAULT 0.00,
  vat_amount numeric(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales_journal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_journal_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales_journal_settings
CREATE POLICY "Users can manage sales journal settings"
  ON sales_journal_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read sales journal settings"
  ON sales_journal_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for sales_journals
CREATE POLICY "Users can manage sales journals"
  ON sales_journals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read sales journals"
  ON sales_journals
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for sales_journal_line_items
CREATE POLICY "Users can manage sales journal line items"
  ON sales_journal_line_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read sales journal line items"
  ON sales_journal_line_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_journals_date ON sales_journals(journal_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_journals_number ON sales_journals(journal_number);
CREATE INDEX IF NOT EXISTS idx_sales_journal_line_items_journal_id ON sales_journal_line_items(journal_id);
CREATE INDEX IF NOT EXISTS idx_sales_journal_line_items_order_id ON sales_journal_line_items(order_id);