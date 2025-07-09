/*
  # Disable RLS and Remove Service Role from All Tables

  1. Disable RLS on all tables
  2. Remove all service role policies
  3. Keep authenticated user policies where needed
*/

-- Disable RLS on all tables that have it enabled
ALTER TABLE return_note_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE return_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE wc_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE return_note_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE wc_order_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE wc_products_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_control_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_controls DISABLE ROW LEVEL SECURITY;

-- Drop all service role policies
DROP POLICY IF EXISTS "Service role can manage wc orders" ON wc_orders;
DROP POLICY IF EXISTS "Service role can manage wc order line items" ON wc_order_line_items;
DROP POLICY IF EXISTS "Service role can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can manage invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Service role can manage cash controls" ON cash_controls;
DROP POLICY IF EXISTS "Service role can manage cash control settings" ON cash_control_settings;

-- Drop all remaining policies since RLS is now disabled
DROP POLICY IF EXISTS "Users can manage return note settings" ON return_note_settings;
DROP POLICY IF EXISTS "Users can read return note settings" ON return_note_settings;
DROP POLICY IF EXISTS "Users can manage return notes" ON return_notes;
DROP POLICY IF EXISTS "Users can read return notes" ON return_notes;
DROP POLICY IF EXISTS "Users can manage purchase order line items" ON purchase_order_line_items;
DROP POLICY IF EXISTS "Users can read purchase order line items" ON purchase_order_line_items;
DROP POLICY IF EXISTS "Users can manage return note line items" ON return_note_line_items;
DROP POLICY IF EXISTS "Users can read return note line items" ON return_note_line_items;
DROP POLICY IF EXISTS "Users can manage purchase order settings" ON purchase_order_settings;
DROP POLICY IF EXISTS "Users can read purchase order settings" ON purchase_order_settings;
DROP POLICY IF EXISTS "Users can manage purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can read purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can manage quote settings" ON quote_settings;
DROP POLICY IF EXISTS "Users can read quote settings" ON quote_settings;
DROP POLICY IF EXISTS "Users can manage quote line items" ON quote_line_items;
DROP POLICY IF EXISTS "Users can read quote line items" ON quote_line_items;
DROP POLICY IF EXISTS "Authenticated users can delete quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can read quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON quotes;
DROP POLICY IF EXISTS "Users can read product cache" ON wc_products_cache;
DROP POLICY IF EXISTS "Users can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Users can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Users can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Users can manage delivery note settings" ON delivery_note_settings;
DROP POLICY IF EXISTS "Users can read delivery note settings" ON delivery_note_settings;
DROP POLICY IF EXISTS "Users can manage delivery note line items" ON delivery_note_line_items;
DROP POLICY IF EXISTS "Users can read delivery note line items" ON delivery_note_line_items;
DROP POLICY IF EXISTS "Users can manage delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can read delivery notes" ON delivery_notes;