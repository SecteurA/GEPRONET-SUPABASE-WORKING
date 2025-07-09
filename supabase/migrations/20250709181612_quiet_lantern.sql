/*
  # Add paid date tracking to invoices

  1. Changes
    - Add `paid_date` column to invoices table to track when invoice was paid
    - Add index on paid_date for efficient querying
    - Update existing paid invoices to have paid_date set to invoice_date as fallback

  2. Notes
    - This enables sales journal creation based on payment dates
    - Only invoices with status 'paid' should have paid_date set
*/

-- Add paid_date column to track when invoice was marked as paid
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_date date DEFAULT NULL;

-- Add index for efficient querying by paid_date
CREATE INDEX IF NOT EXISTS idx_invoices_paid_date 
ON invoices(paid_date) WHERE paid_date IS NOT NULL;

-- Update existing paid invoices to have paid_date set to invoice_date as fallback
UPDATE invoices 
SET paid_date = invoice_date::date
WHERE status = 'paid' AND paid_date IS NULL;