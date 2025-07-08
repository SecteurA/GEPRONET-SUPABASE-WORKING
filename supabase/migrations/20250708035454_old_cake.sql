-- Add inventory_updated column to track WooCommerce inventory updates for delivery notes
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS inventory_updated boolean DEFAULT false;

COMMENT ON COLUMN delivery_notes.inventory_updated IS 'Tracks whether WooCommerce inventory has been updated for this delivery note';

-- Update existing records to have default value
UPDATE delivery_notes 
SET inventory_updated = false 
WHERE inventory_updated IS NULL;