import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface PurchaseOrderLineItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_ordered: number;
}

interface PurchaseOrderData {
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  order_date: string;
  expected_date: string;
  notes: string;
  line_items: PurchaseOrderLineItem[];
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const purchaseOrderData: PurchaseOrderData = await req.json();

    console.log('Received purchase order data:', JSON.stringify(purchaseOrderData));
    
    // Validate required fields
    if (!purchaseOrderData.supplier_name || !purchaseOrderData.line_items || purchaseOrderData.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Supplier name and line items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate purchase order number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('purchase_order_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('purchase_order_settings')
        .insert({
          prefix: 'BG',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create purchase order settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate purchase order number
    const purchaseOrderNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Insert purchase order
    const { data: purchaseOrder, error: purchaseOrderError } = await supabase
      .from('purchase_orders')
      .insert({
        purchase_order_number: purchaseOrderNumber,
        supplier_name: purchaseOrderData.supplier_name,
        supplier_email: purchaseOrderData.supplier_email || '',
        supplier_phone: purchaseOrderData.supplier_phone || '',
        supplier_address: purchaseOrderData.supplier_address || '',
        order_date: purchaseOrderData.order_date || new Date().toISOString().split('T')[0],
        expected_date: purchaseOrderData.expected_date || null,
        status: 'pending',
        notes: purchaseOrderData.notes || '',
      })
      .select()
      .single();

    if (purchaseOrderError) {
      console.error('Purchase order creation error:', purchaseOrderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase order' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert line items
    const lineItemsData = purchaseOrderData.line_items.map(item => ({
      purchase_order_id: purchaseOrder.id,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
    }));

    const { error: lineItemsError } = await supabase
      .from('purchase_order_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      console.error('Line items creation error:', lineItemsError);
      // Delete the purchase order if line items failed
      await supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase order line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update purchase order settings to increment the counter
    await supabase
      .from('purchase_order_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Purchase order created successfully',
        purchase_order: {
          ...purchaseOrder,
          line_items: lineItemsData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-purchase-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});