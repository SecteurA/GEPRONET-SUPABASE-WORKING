/*
  # Remove RLS from Sales Journal Tables

  1. Changes
    - Disable RLS on sales_journal_settings table
    - Disable RLS on sales_journals table  
    - Disable RLS on sales_journal_line_items table
    - Remove service role policies
    - Keep only authenticated user policies where needed

  2. Security
    - Tables will be accessible to authenticated users
    - Service role access removed
*/

-- Disable RLS on sales_journal_settings
ALTER TABLE sales_journal_settings DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sales_journals  
ALTER TABLE sales_journals DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sales_journal_line_items
ALTER TABLE sales_journal_line_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on these tables
DROP POLICY IF EXISTS "Service role can manage sales journal settings" ON sales_journal_settings;
DROP POLICY IF EXISTS "Users can manage sales journal settings" ON sales_journal_settings;
DROP POLICY IF EXISTS "Users can read sales journal settings" ON sales_journal_settings;

DROP POLICY IF EXISTS "Service role can manage sales journals" ON sales_journals;
DROP POLICY IF EXISTS "Users can manage sales journals" ON sales_journals;
DROP POLICY IF EXISTS "Users can read sales journals" ON sales_journals;

DROP POLICY IF EXISTS "Service role can manage sales journal line items" ON sales_journal_line_items;
DROP POLICY IF EXISTS "Users can manage sales journal line items" ON sales_journal_line_items;
DROP POLICY IF EXISTS "Users can read sales journal line items" ON sales_journal_line_items;