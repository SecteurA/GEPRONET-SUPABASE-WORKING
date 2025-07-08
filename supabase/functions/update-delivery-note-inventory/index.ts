import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface UpdateInventoryRequest {
  delivery_note_id: string;
  operation: 'reduce' | 'restore'; // reduce when delivered, restore when cancelled
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

    const { delivery_note_id, operation }: UpdateInventoryRequest = await req.json();

    if (!delivery_note_id || !operation) {
      return new Response(
        JSON.stringify({ error: 'Delivery note ID and operation are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get delivery note details
    const { data: deliveryNote, error: deliveryNoteError } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('id', delivery_note_id)
      .single();

    if (deliveryNoteError || !deliveryNote) {
      return new Response(
        JSON.stringify({ error: 'Delivery note not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get line items for the delivery note
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('delivery_note_line_items')
      .select('*')
      .eq('delivery_note_id', delivery_note_id);

    if (lineItemsError || !lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No line items found for delivery note' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get WooCommerce settings
    const { data: wcSettings, error: wcSettingsError } = await supabase
      .from('wc_settings')
      .select('*')
      .single();

    if (wcSettingsError || !wcSettings) {
      return new Response(
        JSON.stringify({ error: 'WooCommerce settings not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update WooCommerce inventory
    const wcAuth = btoa(`${wcSettings.consumer_key}:${wcSettings.consumer_secret}`);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const item of lineItems) {
      try {
        if (!item.product_id || item.quantity <= 0) {
          continue;
        }

        // Get current product data from WooCommerce
        const productResponse = await fetch(`${wcSettings.api_url}/products/${item.product_id}`, {
          headers: {
            'Authorization': `Basic ${wcAuth}`,
            'Content-Type': 'application/json',
          },
        });

        if (!productResponse.ok) {
          errors.push(`Failed to fetch product ${item.product_id}`);
          errorCount++;
          continue;
        }

        const product = await productResponse.json();
        
        // Only update stock if product manages stock
        if (product.manage_stock) {
          const currentStock = parseInt(product.stock_quantity || 0);
          let newStockQuantity;
          
          if (operation === 'reduce') {
            // Reduce stock when delivered
            newStockQuantity = Math.max(0, currentStock - item.quantity);
          } else {
            // Restore stock when cancelled/returned
            newStockQuantity = currentStock + item.quantity;
          }
          
          // Update product stock in WooCommerce
          const updateResponse = await fetch(`${wcSettings.api_url}/products/${item.product_id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${wcAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stock_quantity: newStockQuantity,
            }),
          });

          if (updateResponse.ok) {
            successCount++;
          } else {
            errors.push(`Failed to update stock for product ${item.product_id}`);
            errorCount++;
          }
        } else {
          // Product doesn't manage stock, count as success
          successCount++;
        }
      } catch (error) {
        errors.push(`Error updating product ${item.product_id}: ${error.message}`);
        errorCount++;
      }
    }

    const message = operation === 'reduce' 
      ? `Inventaire réduit pour ${successCount} produit(s)`
      : `Inventaire restauré pour ${successCount} produit(s)`;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${message}${errorCount > 0 ? ` (${errorCount} erreur(s))` : ''}`,
        updated_count: successCount,
        error_count: errorCount,
        errors: errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in update-delivery-note-inventory function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});