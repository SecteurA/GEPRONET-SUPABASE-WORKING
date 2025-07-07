/*
  # Remove RLS Security

  1. Security Changes
    - Disable RLS on all tables
    - Drop all existing RLS policies
    - Remove security restrictions for simplified access

  2. Tables Affected
    - `wc_settings` - WooCommerce API settings
    - `wc_orders` - WooCommerce orders data
    - `wc_order_line_items` - Order line items data

  3. Changes Made
    - Disabled RLS on all tables
    - Dropped all authentication policies
    - Tables now accessible without row-level restrictions
*/

-- Disable RLS on all tables
ALTER TABLE wc_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE wc_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE wc_order_line_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on wc_settings
DROP POLICY IF EXISTS "Users can insert settings" ON wc_settings;
DROP POLICY IF EXISTS "Users can read settings" ON wc_settings;
DROP POLICY IF EXISTS "Users can update settings" ON wc_settings;

-- Drop all existing policies on wc_orders
DROP POLICY IF EXISTS "Users can insert orders" ON wc_orders;
DROP POLICY IF EXISTS "Users can read orders" ON wc_orders;
DROP POLICY IF EXISTS "Users can update orders" ON wc_orders;

-- Drop all existing policies on wc_order_line_items
DROP POLICY IF EXISTS "Users can read line items" ON wc_order_line_items;
DROP POLICY IF EXISTS "Users can insert line items" ON wc_order_line_items;
DROP POLICY IF EXISTS "Users can update line items" ON wc_order_line_items;