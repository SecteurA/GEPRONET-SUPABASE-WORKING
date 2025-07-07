/*
  # Add Order Line Items Table

  1. New Tables
    - `wc_order_line_items`
      - `id` (uuid, primary key)
      - `order_id` (text, foreign key to wc_orders)
      - `product_id` (text)
      - `product_name` (text)
      - `product_sku` (text, nullable)
      - `quantity` (integer)
      - `price` (numeric)
      - `total` (numeric)
      - `subtotal` (numeric)
      - `tax_total` (numeric)
      - `tax_class` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `wc_order_line_items` table
    - Add policies for authenticated users to read/write line items

  3. Indexes
    - Add index on order_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS wc_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES wc_orders(order_id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_sku text,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_total numeric(10,2) NOT NULL DEFAULT 0,
  tax_class text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wc_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read line items"
  ON wc_order_line_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert line items"
  ON wc_order_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update line items"
  ON wc_order_line_items
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_wc_order_line_items_order_id 
  ON wc_order_line_items USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_wc_order_line_items_product_id 
  ON wc_order_line_items USING btree (product_id);