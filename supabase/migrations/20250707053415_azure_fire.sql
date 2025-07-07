/*
  # Add order source tracking

  1. New Columns
    - `order_source` to track if order is from website or POS
  
  2. Changes
    - Add order_source column to wc_orders table
    - Set default value to 'website' for existing orders
*/

-- Add order_source column to track website vs POS orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wc_orders' AND column_name = 'order_source'
  ) THEN
    ALTER TABLE wc_orders ADD COLUMN order_source text DEFAULT 'website';
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wc_orders_source 
  ON wc_orders USING btree (order_source);