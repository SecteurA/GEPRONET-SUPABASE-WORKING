/*
  # Create Invoice System Tables

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_address` (text)
      - `invoice_date` (date)
      - `due_date` (date)
      - `status` (text, default 'draft')
      - `subtotal_ht` (numeric)
      - `total_vat` (numeric)
      - `total_ttc` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `invoice_line_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key)
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
    
    - `invoice_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'FA')
      - `year` (integer)
      - `current_number` (integer, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - No RLS for simplicity
    
  3. Indexes
    - Performance indexes for common queries
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_address text DEFAULT '',
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft',
  subtotal_ht numeric(10,2) DEFAULT 0.00,
  total_vat numeric(10,2) DEFAULT 0.00,
  total_ttc numeric(10,2) DEFAULT 0.00,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
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

-- Disable RLS for simplicity
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Insert default invoice settings
INSERT INTO invoice_settings (prefix, year, current_number)
VALUES ('FA', EXTRACT(YEAR FROM now()), 1)
ON CONFLICT DO NOTHING;