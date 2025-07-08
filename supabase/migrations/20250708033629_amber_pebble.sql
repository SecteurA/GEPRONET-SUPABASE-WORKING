/*
  # Add delivery note processing tracking

  1. Changes
    - Add `invoiced` boolean flag to track if delivery note has been invoiced
    - Add `invoice_id` back as optional reference to generated invoice
    - Add new status 'invoiced' for processed delivery notes
    - Add index for better querying

  2. Notes
    - `invoiced` flag helps with quick filtering
    - `invoice_id` allows tracking which invoice was generated
    - Status 'invoiced' indicates the delivery note has been processed
*/

-- Add invoiced boolean flag to track processing
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false;

-- Add foreign key reference to invoice (optional, for tracking)
ALTER TABLE delivery_notes 
ADD CONSTRAINT delivery_notes_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Add index for querying invoiced delivery notes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoiced 
ON delivery_notes(invoiced);

-- Add index back for invoice_id (optional reference)
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id 
ON delivery_notes(invoice_id) WHERE invoice_id IS NOT NULL;

-- Update existing delivery notes to have invoiced = false if not set
UPDATE delivery_notes 
SET invoiced = false 
WHERE invoiced IS NULL;