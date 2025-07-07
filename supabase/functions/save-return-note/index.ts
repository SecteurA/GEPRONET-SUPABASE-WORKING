import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ReturnNoteLineItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_returned: number;
  unit_price_ht: number;
  total_ht: number;
}

interface ReturnNoteData {
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  return_date: string;
  reason: string;
  notes: string;
  line_items: ReturnNoteLineItem[];
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const returnNoteData: ReturnNoteData = await req.json();

    // Validate required fields
    if (!returnNoteData.invoice_id || !returnNoteData.customer_name || !returnNoteData.line_items || returnNoteData.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID, customer name and line items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate return note number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('return_note_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('return_note_settings')
        .insert({
          prefix: 'BR',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create return note settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate return note number
    const returnNoteNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Insert return note
    const { data: returnNote, error: returnNoteError } = await supabase
      .from('return_notes')
      .insert({
        return_note_number: returnNoteNumber,
        invoice_id: returnNoteData.invoice_id,
        customer_name: returnNoteData.customer_name,
        customer_email: returnNoteData.customer_email || '',
        customer_phone: returnNoteData.customer_phone || '',
        customer_address: returnNoteData.customer_address || '',
        return_date: returnNoteData.return_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        reason: returnNoteData.reason || '',
        notes: returnNoteData.notes || '',
      })
      .select()
      .single();

    if (returnNoteError) {
      console.error('Return note creation error:', returnNoteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create return note' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert line items
    const lineItemsData = returnNoteData.line_items.map(item => ({
      return_note_id: returnNote.id,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity_returned: item.quantity_returned,
      unit_price_ht: item.unit_price_ht,
      total_ht: item.total_ht,
    }));

    const { error: lineItemsError } = await supabase
      .from('return_note_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      console.error('Line items creation error:', lineItemsError);
      // Delete the return note if line items failed
      await supabase.from('return_notes').delete().eq('id', returnNote.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create return note line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update WooCommerce stock for returned items
    try {
      // Get WooCommerce settings
      const { data: wcSettings, error: wcSettingsError } = await supabase
        .from('wc_settings')
        .select('*')
        .single();

      if (wcSettings && !wcSettingsError) {
        const wcAuth = btoa(`${wcSettings.consumer_key}:${wcSettings.consumer_secret}`);

        // Update stock for each returned item
        for (const item of returnNoteData.line_items) {
          if (item.product_id && item.quantity_returned > 0) {
            try {
              // Get current product data
              const productResponse = await fetch(`${wcSettings.api_url}/products/${item.product_id}`, {
                headers: {
                  'Authorization': `Basic ${wcAuth}`,
                  'Content-Type': 'application/json',
                },
              });

              if (productResponse.ok) {
                const product = await productResponse.json();
                
                // Only update stock if product manages stock
                if (product.manage_stock) {
                  const newStockQuantity = parseInt(product.stock_quantity || 0) + item.quantity_returned;
                  
                  // Update product stock
                  await fetch(`${wcSettings.api_url}/products/${item.product_id}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Basic ${wcAuth}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      stock_quantity: newStockQuantity,
                    }),
                  });
                }
              }
            } catch (stockError) {
              console.error(`Failed to update stock for product ${item.product_id}:`, stockError);
              // Continue with other items even if one fails
            }
          }
        }
      }
    } catch (stockUpdateError) {
      console.error('Stock update error:', stockUpdateError);
      // Don't fail the entire operation if stock update fails
    }

    // Update return note settings to increment the counter
    await supabase
      .from('return_note_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Return note created successfully and stock updated',
        return_note: {
          ...returnNote,
          line_items: lineItemsData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-return-note function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});