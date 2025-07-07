/*
  # Add calculated VAT rate to WooCommerce line items

  1. New Columns
    - `calculated_vat_rate` (numeric) - Calculated VAT rate based on actual WooCommerce tax data

  2. Changes
    - Add calculated_vat_rate column to wc_order_line_items table
    - This will store the actual VAT rate calculated from WooCommerce tax amounts
*/

-- Add calculated_vat_rate column to track actual VAT rates from WooCommerce
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wc_order_line_items' AND column_name = 'calculated_vat_rate'
  ) THEN
    ALTER TABLE wc_order_line_items ADD COLUMN calculated_vat_rate numeric(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Update existing records to calculate VAT rate from existing data
UPDATE wc_order_line_items 
SET calculated_vat_rate = CASE 
  WHEN subtotal > 0 AND tax_total > 0 THEN 
    ROUND((tax_total / subtotal) * 100, 2)
  ELSE 0.00
END
WHERE calculated_vat_rate IS NULL OR calculated_vat_rate = 0.00;

-- Add comment for clarity
COMMENT ON COLUMN wc_order_line_items.calculated_vat_rate IS 'Calculated VAT rate percentage based on actual WooCommerce tax data';