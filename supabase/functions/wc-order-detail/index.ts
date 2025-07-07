import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

    if (req.method === 'POST') {
      const { order_id } = await req.json();

      if (!order_id) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get order details from database
      const { data: order, error: orderError } = await supabase
        .from('wc_orders')
        .select('*')
        .eq('order_id', order_id)
        .single();

      if (orderError) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get line items for the order
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('wc_order_line_items')
        .select('*')
        .eq('order_id', order_id)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      return new Response(
        JSON.stringify({
          ...order,
          line_items: lineItems || []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
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