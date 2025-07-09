/*
  # Fix Sales Journal Database Issues
  
  1. Add missing RLS policies for service role access
  2. Add missing indexes for performance
  3. Fix any missing table permissions
  
  This should resolve the EarlyDrop timeout issues.
*/

-- Add missing RLS policies for invoice_line_items (needed for service role)
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage invoice line items"
  ON invoice_line_items
  FOR ALL
  TO service_role
  USING (true);

-- Add missing RLS policies for wc_order_line_items (needed for service role)  
ALTER TABLE wc_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage wc order line items"
  ON wc_order_line_items
  FOR ALL
  TO service_role
  USING (true);

-- Add missing RLS policies for wc_orders (needed for service role)
ALTER TABLE wc_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage wc orders"
  ON wc_orders
  FOR ALL
  TO service_role
  USING (true);

-- Add missing RLS policies for invoices (needed for service role)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage invoices"
  ON invoices
  FOR ALL
  TO service_role
  USING (true);

-- Add performance indexes for sales journal queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_paid_date 
ON invoices(status, paid_date) WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_wc_orders_status_date 
ON wc_orders(order_status, order_date) WHERE order_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id 
ON invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_wc_order_line_items_order_id 
ON wc_order_line_items(order_id);

-- Ensure sales journal tables have proper RLS policies
CREATE POLICY "Service role can manage sales journal settings"
  ON sales_journal_settings
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage sales journals"
  ON sales_journals
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage sales journal line items"
  ON sales_journal_line_items
  FOR ALL
  TO service_role
  USING (true);

-- Ensure cash control tables have proper RLS policies
CREATE POLICY "Service role can manage cash controls"
  ON cash_controls
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage cash control settings"
  ON cash_control_settings
  FOR ALL
  TO service_role
  USING (true);