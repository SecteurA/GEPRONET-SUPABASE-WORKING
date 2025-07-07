import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface DeliveryNoteLineItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
}

interface DeliveryNoteData {
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  notes: string;
  line_items: DeliveryNoteLineItem[];
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

    const deliveryNoteData: DeliveryNoteData = await req.json();

    // Validate required fields
    if (!deliveryNoteData.invoice_id || !deliveryNoteData.customer_name || !deliveryNoteData.line_items || deliveryNoteData.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID, customer name and line items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate delivery note number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('delivery_note_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('delivery_note_settings')
        .insert({
          prefix: 'BL',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create delivery note settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate delivery note number
    const deliveryNoteNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Insert delivery note
    const { data: deliveryNote, error: deliveryNoteError } = await supabase
      .from('delivery_notes')
      .insert({
        delivery_note_number: deliveryNoteNumber,
        invoice_id: deliveryNoteData.invoice_id,
        customer_name: deliveryNoteData.customer_name,
        customer_email: deliveryNoteData.customer_email || '',
        customer_phone: deliveryNoteData.customer_phone || '',
        customer_address: deliveryNoteData.customer_address || '',
        delivery_date: deliveryNoteData.delivery_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: deliveryNoteData.notes || '',
      })
      .select()
      .single();

    if (deliveryNoteError) {
      console.error('Delivery note creation error:', deliveryNoteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create delivery note' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert line items
    const lineItemsData = deliveryNoteData.line_items.map(item => ({
      delivery_note_id: deliveryNote.id,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
    }));

    const { error: lineItemsError } = await supabase
      .from('delivery_note_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      console.error('Line items creation error:', lineItemsError);
      // Delete the delivery note if line items failed
      await supabase.from('delivery_notes').delete().eq('id', deliveryNote.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create delivery note line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update delivery note settings to increment the counter
    await supabase
      .from('delivery_note_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Delivery note created successfully',
        delivery_note: {
          ...deliveryNote,
          line_items: lineItemsData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-delivery-note function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});