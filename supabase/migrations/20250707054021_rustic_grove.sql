/*
  # Create clients table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `company_name` (text)
      - `woocommerce_customer_id` (integer)
      - `address_line1` (text)
      - `address_line2` (text)
      - `city` (text)
      - `state` (text)
      - `postal_code` (text)
      - `country` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_synced_with_woo` (boolean)
      - `last_sync_date` (timestamp)
  2. Security
    - Disable RLS for simplicity
  3. Indexes
    - Email index for performance
    - WooCommerce customer ID index
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  company_name text DEFAULT '',
  woocommerce_customer_id integer UNIQUE,
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  postal_code text DEFAULT '',
  country text DEFAULT 'MA',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_synced_with_woo boolean DEFAULT false,
  last_sync_date timestamptz
);

-- Disable RLS for simplicity
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email 
  ON clients USING btree (email);

CREATE INDEX IF NOT EXISTS idx_clients_woo_customer_id 
  ON clients USING btree (woocommerce_customer_id);

CREATE INDEX IF NOT EXISTS idx_clients_name 
  ON clients USING btree (first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_clients_sync_status 
  ON clients USING btree (is_synced_with_woo);