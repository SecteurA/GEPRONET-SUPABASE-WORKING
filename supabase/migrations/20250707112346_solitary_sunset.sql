/*
  # Create Purchase Orders System

  1. New Tables
    - `purchase_order_settings`
      - `id` (uuid, primary key)
      - `prefix` (text, default 'BG')
      - `year` (integer)
      - `current_number` (integer)
    - `purchase_orders`
      - `id` (uuid, primary key)  
      - `purchase_order_number` (text, unique)
      - `supplier_name` (text)
      - `supplier_email` (text)
      - `supplier_phone` (text)
      - `supplier_address` (text)
      - `order_date` (date)
      - `expected_date` (date)
      - `status` (text, default 'pending')
      - `notes` (text)
    - `purchase_order_line_items`
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, references purchase_orders)
      - `product_id` (text)
      - `product_sku` (text)
      - `product_name` (text)
      - `quantity_ordered` (integer)
      - `quantity_received` (integer, default 0)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create purchase order settings table
CREATE TABLE IF NOT EXISTS purchase_order_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text DEFAULT 'BG',
  year integer DEFAULT EXTRACT(year FROM now()),
  current_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_number text UNIQUE NOT NULL,
  supplier_name text NOT NULL DEFAULT '',
  supplier_email text DEFAULT '',
  supplier_phone text DEFAULT '',
  supplier_address text DEFAULT '',
  order_date date DEFAULT CURRENT_DATE,
  expected_date date,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase order line items table
CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_sku text DEFAULT '',
  product_name text NOT NULL,
  quantity_ordered integer DEFAULT 1,
  quantity_received integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(purchase_order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_purchase_order_id ON purchase_order_line_items(purchase_order_id);

-- Enable RLS
ALTER TABLE purchase_order_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read purchase order settings" ON purchase_order_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage purchase order settings" ON purchase_order_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read purchase orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage purchase orders" ON purchase_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read purchase order line items" ON purchase_order_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage purchase order line items" ON purchase_order_line_items FOR ALL TO authenticated USING (true);