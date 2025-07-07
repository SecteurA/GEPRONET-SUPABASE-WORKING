/*
  # Remove WooCommerce synchronization fields from clients table

  1. Changes
    - Remove `woocommerce_customer_id` column
    - Remove `is_synced_with_woo` column  
    - Remove `last_sync_date` column
    - Drop related indexes
    - Remove unique constraint on woocommerce_customer_id

  2. Notes
    - This migration removes all WooCommerce synchronization capabilities
    - All data in these columns will be permanently lost
*/

-- Drop indexes first
DROP INDEX IF EXISTS idx_clients_woo_customer_id;
DROP INDEX IF EXISTS idx_clients_sync_status;

-- Drop unique constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_woocommerce_customer_id_key;

-- Remove WooCommerce-related columns
ALTER TABLE clients DROP COLUMN IF EXISTS woocommerce_customer_id;
ALTER TABLE clients DROP COLUMN IF EXISTS is_synced_with_woo;
ALTER TABLE clients DROP COLUMN IF EXISTS last_sync_date;