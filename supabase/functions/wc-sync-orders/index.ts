import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WCLineItem {
  id: number;
  name: string;
  product_id: number;
  sku: string;
  quantity: number;
  price: number;
  total: string;
  subtotal: string;
  total_tax: string;
  tax_class: string;
}

interface WCOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  payment_method_title: string;
  line_items: WCLineItem[];
  meta_data: Array<{
    key: string;
    value: string;
  }>;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get WooCommerce settings
    const { data: settings, error: settingsError } = await supabase
      .from('wc_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'WooCommerce settings not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch orders from WooCommerce API
    const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    const wcResponse = await fetch(`${settings.api_url}/orders?per_page=100&orderby=date&order=desc`, {
      headers: {
        'Authorization': `Basic ${wcAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!wcResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders from WooCommerce' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const wcOrders: WCOrder[] = await wcResponse.json();

    // Process and upsert orders
    const detectOrderSource = (order: WCOrder): string => {
      // Check meta data for POS indicators
      const posIndicators = [
        '_pos_',
        'pos_register',
        'square_pos',
        'loyverse_pos',
        'retail_pos',
        'point_of_sale',
        'woocommerce_pos'
      ];
      
      const metaDataString = JSON.stringify(order.meta_data || []).toLowerCase();
      const paymentMethod = (order.payment_method_title || '').toLowerCase();
      
      // Check if any POS indicators are present
      for (const indicator of posIndicators) {
        if (metaDataString.includes(indicator) || paymentMethod.includes(indicator)) {
          return 'pos';
        }
      }
      
      // Check for cash payments (common in POS)
      if (paymentMethod.includes('cash') || paymentMethod.includes('espèces')) {
        return 'pos';
      }
      
      return 'website';
    };

    const processedOrders = wcOrders.map(order => ({
      order_id: order.id.toString(),
      order_number: order.number,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      customer_email: order.billing.email,
      order_status: order.status,
      total_amount: parseFloat(order.total),
      payment_method: order.payment_method_title || 'N/A',
      shipping_address: [
        order.shipping.address_1,
        order.shipping.address_2,
        order.shipping.city,
        order.shipping.state,
        order.shipping.postcode,
        order.shipping.country
      ].filter(Boolean).join(', '),
      billing_address: [
        order.billing.address_1,
        order.billing.address_2,
        order.billing.city,
        order.billing.state,
        order.billing.postcode,
        order.billing.country
      ].filter(Boolean).join(', '),
      order_date: order.date_created,
      order_source: detectOrderSource(order),
      updated_at: new Date().toISOString(),
    }));

    // Upsert orders in database
    const { error: upsertError } = await supabase
      .from('wc_orders')
      .upsert(processedOrders, {
        onConflict: 'order_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save orders to database' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process and upsert line items
    const allLineItems = [];
    for (const order of wcOrders) {
      const lineItems = order.line_items.map(item => ({
        order_id: order.id.toString(),
        product_id: item.product_id.toString(),
        product_name: item.name,
        product_sku: item.sku || null,
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),
        total: parseFloat(item.total),
        subtotal: parseFloat(item.subtotal),
        tax_total: parseFloat(item.total_tax),
        tax_class: item.tax_class || null,
        updated_at: new Date().toISOString(),
      }));
      allLineItems.push(...lineItems);
    }

    // Delete existing line items for these orders and insert new ones
    if (allLineItems.length > 0) {
      const orderIds = [...new Set(allLineItems.map(item => item.order_id))];
      
      // Delete existing line items
      await supabase
        .from('wc_order_line_items')
        .delete()
        .in('order_id', orderIds);

      // Insert new line items
      const { error: lineItemsError } = await supabase
        .from('wc_order_line_items')
        .insert(allLineItems);

      if (lineItemsError) {
        console.error('Error saving line items:', lineItemsError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${processedOrders.length} orders with ${allLineItems.length} line items`,
        count: processedOrders.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});