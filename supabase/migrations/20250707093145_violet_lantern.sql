/*
  # Add order source tracking to invoices

  1. New Columns
    - `source_order_id` (text, nullable) - References the original WooCommerce order ID
    - `source_type` (text, default 'manual') - Tracks if invoice was generated from order or created manually

  2. Security
    - No RLS changes needed as invoices table doesn't have RLS enabled

  This allows us to track which invoices were generated from which orders
  and provide appropriate actions in the orders list.
*/

-- Add source tracking columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source_order_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN source_order_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN source_type text DEFAULT 'manual';
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_source_order_id ON invoices(source_order_id);