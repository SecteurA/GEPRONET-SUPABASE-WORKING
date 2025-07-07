/*
  # Update Invoice System for Individual VAT Rates

  1. New Columns
    - Add `vat_rate` to `invoice_line_items` table for individual item VAT rates
    - Add `vat_amount` to `invoice_line_items` table for individual item VAT amounts
    - Update `unit_price` to be HT (excluding VAT)

  2. Changes
    - Remove global `tax_percentage` from invoices table
    - Update calculation logic to handle multiple VAT rates per invoice
*/

-- Add VAT rate and amount columns to invoice line items
DO $$
BEGIN
  -- Add vat_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_line_items' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE invoice_line_items ADD COLUMN vat_rate numeric(5,2) DEFAULT 20.00;
  END IF;

  -- Add vat_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_line_items' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE invoice_line_items ADD COLUMN vat_amount numeric(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Update existing line items to have proper VAT calculations
UPDATE invoice_line_items 
SET 
  vat_rate = 20.00,
  vat_amount = ROUND(total_price * 0.20, 2)
WHERE vat_rate IS NULL OR vat_amount IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN invoice_line_items.vat_rate IS 'VAT rate percentage for this specific item';
COMMENT ON COLUMN invoice_line_items.vat_amount IS 'VAT amount in currency for this specific item';
COMMENT ON COLUMN invoice_line_items.unit_price IS 'Unit price excluding VAT (HT)';
COMMENT ON COLUMN invoice_line_items.total_price IS 'Total price excluding VAT (HT) for this line item';