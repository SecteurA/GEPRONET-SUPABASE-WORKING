import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ReceivedItem {
  id: string;
  quantity_received: number;
}

interface ValidatePurchaseOrderRequest {
  purchase_order_id: string;
  received_items: ReceivedItem[];
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

    const { purchase_order_id, received_items }: ValidatePurchaseOrderRequest = await req.json();

    if (!purchase_order_id || !received_items || received_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Purchase order ID and received items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the purchase order is already completed
    const { data: purchaseOrderData, error: purchaseOrderError } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', purchase_order_id)
      .single();

    if (purchaseOrderError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch purchase order' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const alreadyCompleted = purchaseOrderData.status === 'completed';

    // First, fetch the current quantities for each item to calculate differences
    const lineItemIds = received_items.map(item => item.id);
    const { data: currentLineItems, error: currentLineItemsError } = await supabase
      .from('purchase_order_line_items')
      .select('id, quantity_received')
      .in('id', lineItemIds);
      
    if (currentLineItemsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch current line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Create a map of current received quantities
    const currentQuantities: Record<string, number> = {};
    currentLineItems?.forEach(item => {
      currentQuantities[item.id] = item.quantity_received || 0;
    });

    // Update received quantities in database
    const updatePromises = received_items.map(item => 
      supabase
        .from('purchase_order_line_items')
        .update({ 
          quantity_received: item.quantity_received,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    );

    const updateResults = await Promise.all(updatePromises);
    
    // Check if all updates were successful
    const hasErrors = updateResults.some(result => result.error);
    if (hasErrors) {
      return new Response(
        JSON.stringify({ error: 'Failed to update received quantities' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let stockUpdateCount = 0;
    let stockUpdateErrors = 0;
    
    // Only update WooCommerce stock if the order wasn't already completed
    if (!alreadyCompleted) {
      // Get WooCommerce settings
      const { data: wcSettings, error: wcSettingsError } = await supabase
        .from('wc_settings')
        .select('*')
        .single();

      if (!wcSettings || wcSettingsError) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Purchase order updated but WooCommerce settings not found. Stock not updated.',
            stock_updated: false
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update WooCommerce inventory
      const wcAuth = btoa(`${wcSettings.consumer_key}:${wcSettings.consumer_secret}`);

      for (const receivedItem of received_items) {
        try {
          // Get the line item details to find product_id
          const { data: lineItem, error: lineItemError } = await supabase
            .from('purchase_order_line_items')
            .select('product_id, product_name, quantity_received')
            .eq('id', receivedItem.id)
            .single();

          if (lineItemError || !lineItem) {
            console.error('Failed to get line item:', lineItemError);
            stockUpdateErrors++;
            continue;
          }

          // Calculate the difference in received quantity to only add the new units
          const previouslyReceived = currentQuantities[receivedItem.id] || 0;
          const newUnits = receivedItem.quantity_received - previouslyReceived;
          
          // Only proceed if there are new units to add to inventory
          if (newUnits > 0) {
            // Get current product data from WooCommerce
            const productResponse = await fetch(`${wcSettings.api_url}/products/${lineItem.product_id}`, {
              headers: {
                'Authorization': `Basic ${wcAuth}`,
                'Content-Type': 'application/json',
              },
            });

            if (productResponse.ok) {
              const product = await productResponse.json();
              
              // Only update stock if product manages stock
              if (product.manage_stock) {
                const currentStock = parseInt(product.stock_quantity || 0);
                const newStockQuantity = currentStock + newUnits;
                
                // Update product stock in WooCommerce
                const updateResponse = await fetch(`${wcSettings.api_url}/products/${lineItem.product_id}`, {
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
                  stockUpdateCount++;
                } else {
                  console.error(`Failed to update stock for product ${lineItem.product_id}`);
                  stockUpdateErrors++;
                }
              }
            } else {
              console.error(`Failed to get product ${lineItem.product_id} from WooCommerce`);
              stockUpdateErrors++;
            }
          }
        } catch (stockError) {
          console.error(`Stock update error for item ${receivedItem.id}:`, stockError);
          stockUpdateErrors++;
        }
      }
    }

    // Check if all items are fully received and update purchase order status
    const { data: allLineItems, error: allLineItemsError } = await supabase
      .from('purchase_order_line_items')
      .select('quantity_ordered, quantity_received')
      .eq('purchase_order_id', purchase_order_id);

    if (!allLineItemsError && allLineItems) {
      const allItemsReceived = allLineItems.every(item => 
        item.quantity_received >= item.quantity_ordered
      );

      const partiallyReceived = allLineItems.some(item => 
        item.quantity_received > 0
      );

      let newStatus = 'pending';
      if (allItemsReceived) {
        newStatus = 'completed';
      } else if (partiallyReceived) {
        newStatus = 'partial';
      }

      // Update purchase order status
      await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchase_order_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: alreadyCompleted
          ? 'Quantités mises à jour mais inventaire inchangé car le bon de commande est déjà terminé'
          : 'Bon de commande validé et inventaire mis à jour',
        stock_updated: !alreadyCompleted && stockUpdateCount > 0,
        stock_update_count: stockUpdateCount,
        stock_update_errors: stockUpdateErrors,
        already_completed: alreadyCompleted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in validate-purchase-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});