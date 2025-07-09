/*
  # Add payment method support to invoices and cash controls

  1. Changes to invoices table:
    - Add payment_method column to track how invoice was paid
    - Add index for efficient querying

  2. Changes to cash_controls table:
    - Add check_total column for check payments
    - Update existing records to have default values

  3. Security
    - No RLS changes needed, existing policies apply
*/

-- Add payment method column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- Create index for payment method queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method 
ON invoices(payment_method) WHERE payment_method IS NOT NULL;

-- Add check total column to cash controls
ALTER TABLE cash_controls 
ADD COLUMN IF NOT EXISTS check_total numeric(12,2) DEFAULT 0.00;

-- Update existing cash controls to have check_total = 0
UPDATE cash_controls 
SET check_total = 0.00 
WHERE check_total IS NULL;

-- Add comment for payment method column
COMMENT ON COLUMN invoices.payment_method IS 'Payment method: Espèces, Virements, or Chèque';
COMMENT ON COLUMN cash_controls.check_total IS 'Total amount received by check';