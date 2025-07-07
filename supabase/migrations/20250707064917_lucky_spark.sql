/*
  # Clean Invoice Tables from Database

  1. Drop Tables
    - Drop `invoice_line_items` table
    - Drop `invoices` table  
    - Drop `invoice_settings` table

  2. Clean Up
    - Drop all foreign key constraints
    - Drop all indexes related to invoice tables
    - Remove all invoice-related policies

  3. Notes
    - This migration permanently removes all invoice data
    - All invoice records will be lost
    - Invoice settings and configurations will be deleted
*/

-- Drop invoice line items table (has foreign key, drop first)
DROP TABLE IF EXISTS invoice_line_items CASCADE;

-- Drop invoices table  
DROP TABLE IF EXISTS invoices CASCADE;

-- Drop invoice settings table
DROP TABLE IF EXISTS invoice_settings CASCADE;

-- Drop any remaining indexes (in case they weren't dropped with CASCADE)
DROP INDEX IF EXISTS idx_invoices_date;
DROP INDEX IF EXISTS idx_invoices_customer;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_number;
DROP INDEX IF EXISTS idx_invoice_line_items_invoice_id;

-- Note: RLS policies are automatically dropped when tables are dropped