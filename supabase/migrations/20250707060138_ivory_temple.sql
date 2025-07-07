/*
  # Create Invoice System Tables

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `order_id` (text, optional reference to original order)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_address` (text)
      - `invoice_date` (timestamp)
      - `due_date` (timestamp)
      - `status` (text)
      - `subtotal_amount` (numeric)
      - `tax_amount` (numeric)
      - `total_amount` (numeric)
      - `tax_percentage` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `invoice_line_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key)
      - `product_name` (text)
      - `product_sku` (text)
      - `description` (text)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `total_price` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `invoice_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'FA')
      - `year` (integer)
      - `current_number` (integer, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  order_id text,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  invoice_date timestamptz DEFAULT now(),
  due_date timestamptz,
  status text DEFAULT 'draft',
  subtotal_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 20,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  product_name text NOT NULL DEFAULT '',
  product_sku text DEFAULT '',
  description text DEFAULT '',
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice settings table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'FA',
  year integer DEFAULT EXTRACT(YEAR FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE invoice_line_items 
ADD CONSTRAINT invoice_line_items_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage invoice line items"
  ON invoice_line_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage invoice settings"
  ON invoice_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default invoice settings
INSERT INTO invoice_settings (prefix, year, current_number)
VALUES ('FA', EXTRACT(YEAR FROM now()), 1)
ON CONFLICT DO NOTHING;