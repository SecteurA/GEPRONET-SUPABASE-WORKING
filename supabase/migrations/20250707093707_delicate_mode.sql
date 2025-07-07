/*
  # Rollback source tracking columns from invoices table

  1. Changes
    - Remove source_order_id column from invoices table  
    - Remove source_type column from invoices table
    - Remove idx_invoices_source_order_id index

  This rollback removes the source tracking functionality that was added in the previous migration.
*/

-- Drop the index first
DROP INDEX IF EXISTS idx_invoices_source_order_id;

-- Remove the columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source_order_id'
  ) THEN
    ALTER TABLE invoices DROP COLUMN source_order_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE invoices DROP COLUMN source_type;
  END IF;
END $$;