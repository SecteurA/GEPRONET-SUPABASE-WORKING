/*
  # Create suppliers (fournisseurs) table

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `company_name` (text)
      - `ice` (text)
      - `address_line1` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on suppliers table
    - Add policies for authenticated users to manage suppliers
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text DEFAULT '' NOT NULL,
  last_name text DEFAULT '' NOT NULL,
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  company_name text DEFAULT '',
  ice text DEFAULT '' NOT NULL,
  address_line1 text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(first_name, last_name);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage suppliers" ON suppliers FOR ALL TO authenticated USING (true);