/*
  # Add pricing columns to delivery notes

  1. Schema Changes
    - Add pricing columns to `delivery_note_line_items` table:
      - `unit_price_ht` (numeric) - Unit price excluding tax
      - `total_ht` (numeric) - Total excluding tax  
      - `vat_percentage` (numeric) - VAT percentage
      - `vat_amount` (numeric) - VAT amount

  2. Notes
    - Default values set to 0.00 for existing records
    - All new pricing fields are nullable to allow gradual migration
*/

-- Add pricing columns to delivery_note_line_items
ALTER TABLE delivery_note_line_items 
ADD COLUMN IF NOT EXISTS unit_price_ht numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_ht numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vat_percentage numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vat_amount numeric(10,2) DEFAULT 0.00;

-- Add pricing totals to delivery_notes table
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS subtotal_ht numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_vat numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_ttc numeric(10,2) DEFAULT 0.00;

-- Update existing records to have default values
UPDATE delivery_note_line_items 
SET 
  unit_price_ht = 0.00,
  total_ht = 0.00,
  vat_percentage = 0.00,
  vat_amount = 0.00
WHERE unit_price_ht IS NULL;

UPDATE delivery_notes 
SET 
  subtotal_ht = 0.00,
  total_vat = 0.00,
  total_ttc = 0.00
WHERE subtotal_ht IS NULL;