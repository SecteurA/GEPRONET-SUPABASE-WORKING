/*
  # Remove delivery note to invoice relationship

  1. Changes
    - Remove foreign key constraint between delivery_notes and invoices
    - Make invoice_id column nullable and optional
    - Update delivery note generation to work independently

  2. Security
    - Maintain existing RLS policies

  3. Notes
    - This migration removes the workflow where delivery notes are generated from invoices
    - Delivery notes will now be created independently
*/

-- Remove the foreign key constraint first
ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_invoice_id_fkey;

-- Make invoice_id nullable (it may already be nullable, but ensure it)
ALTER TABLE delivery_notes ALTER COLUMN invoice_id DROP NOT NULL;

-- Update the column comment to reflect the change
COMMENT ON COLUMN delivery_notes.invoice_id IS 'Optional reference to related invoice (legacy field)';

-- Remove the index on invoice_id since it's no longer a required relationship
DROP INDEX IF EXISTS idx_delivery_notes_invoice_id;