/*
  # Create WooCommerce Orders Table

  1. New Tables
    - `wc_orders`
      - `order_id` (text, primary key) - WooCommerce order ID
      - `order_number` (text) - Order number display
      - `customer_name` (text) - Customer full name
      - `customer_email` (text) - Customer email address
      - `order_status` (text) - Order status (pending, processing, completed, etc.)
      - `total_amount` (decimal) - Total amount in DH
      - `payment_method` (text) - Payment method used
      - `shipping_address` (text) - Shipping address
      - `billing_address` (text) - Billing address
      - `order_date` (timestamptz) - Order date
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

    - `wc_settings`
      - `id` (uuid, primary key)
      - `api_url` (text) - WooCommerce API URL
      - `consumer_key` (text) - Consumer key
      - `consumer_secret` (text) - Consumer secret
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create WooCommerce orders table
CREATE TABLE IF NOT EXISTS wc_orders (
  order_id text PRIMARY KEY,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  order_status text NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  shipping_address text,
  billing_address text,
  order_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create WooCommerce settings table
CREATE TABLE IF NOT EXISTS wc_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for wc_orders
CREATE POLICY "Users can read orders"
  ON wc_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert orders"
  ON wc_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update orders"
  ON wc_orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for wc_settings
CREATE POLICY "Users can read settings"
  ON wc_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert settings"
  ON wc_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update settings"
  ON wc_settings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wc_orders_date ON wc_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_wc_orders_status ON wc_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_wc_orders_customer ON wc_orders(customer_name);

-- Insert default settings
INSERT INTO wc_settings (api_url, consumer_key, consumer_secret)
VALUES (
  'https://gepronet.ma/wp-json/wc/v3',
  'ck_3763e8f7e25f5ec9770667f37c99aed87cfa28a0',
  'cs_d8646d96c29b7ac08487aed2429030cfb2eb61d2'
) ON CONFLICT DO NOTHING;