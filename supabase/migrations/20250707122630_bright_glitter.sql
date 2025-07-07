/*
  # Create product cache and app settings tables
  
  1. New Tables
    - `wc_products_cache`
      - `id` (text, primary key) - Product ID from WooCommerce
      - `name` (text) - Product name
      - `sku` (text) - Product SKU code
      - `price` (numeric) - Current price
      - `regular_price` (numeric) - Regular price
      - `tax_class` (text) - Tax class
      - `categories` (jsonb) - Product categories
      - `stock_status` (text) - Stock status (in_stock, out_of_stock)
      - `manage_stock` (boolean) - Whether stock is managed
      - `stock_quantity` (integer) - Stock quantity
      - `created_at` (timestamp) - Record creation time
      - `last_synced_at` (timestamp) - Last sync time
    
    - `app_settings`
      - `key` (text, primary key) - Setting key
      - `value` (jsonb) - Setting value
      - `created_at` (timestamp) - Record creation time
      - `updated_at` (timestamp) - Last update time

  2. Security
    - Enable RLS on the tables
    - Add policies for authenticated users
*/

-- Create products cache table
CREATE TABLE IF NOT EXISTS wc_products_cache (
  id text PRIMARY KEY,
  name text NOT NULL,
  sku text,
  price numeric(10,2) DEFAULT 0.00,
  regular_price numeric(10,2) DEFAULT 0.00,
  tax_class text DEFAULT '',
  categories jsonb DEFAULT '[]',
  stock_status text,
  manage_stock boolean DEFAULT false,
  stock_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now()
);

-- Create app settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create basic indexes for faster search
CREATE INDEX IF NOT EXISTS idx_wc_products_cache_name ON wc_products_cache(name);
CREATE INDEX IF NOT EXISTS idx_wc_products_cache_sku ON wc_products_cache(sku);

-- Enable RLS
ALTER TABLE wc_products_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read product cache" 
  ON wc_products_cache 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can read app settings" 
  ON app_settings 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow authenticated users to update app settings
CREATE POLICY "Users can update app settings" 
  ON app_settings 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Allow authenticated users to insert app settings
CREATE POLICY "Users can insert app settings" 
  ON app_settings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);