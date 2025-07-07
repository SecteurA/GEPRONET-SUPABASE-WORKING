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

    if (req.method !== 'GET') {
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

    // Fetch products from WooCommerce API
    const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    
    // Get URL parameters for pagination and search
    const url = new URL(req.url);
    const page = url.searchParams.get('page') || '1';
    const per_page = url.searchParams.get('per_page') || '50';
    const search = url.searchParams.get('search') || '';
    
    let wcUrl = `${settings.api_url}/products?page=${page}&per_page=${per_page}&status=publish`;
    
    if (search) {
      wcUrl += `&search=${encodeURIComponent(search)}`;
    }

    const wcResponse = await fetch(wcUrl, {
      headers: {
        'Authorization': `Basic ${wcAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!wcResponse.ok) {
      const errorText = await wcResponse.text();
      console.error('WooCommerce API Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products from WooCommerce' }),
        {
          status: wcResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const products = await wcResponse.json();

    // Transform products to include only necessary fields
    const transformedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      price: product.price || '0',
      regular_price: product.regular_price || product.price || '0',
      tax_class: product.tax_class || '',
      categories: product.categories || [],
      stock_status: product.stock_status,
      manage_stock: product.manage_stock,
      stock_quantity: product.stock_quantity,
    }));

    return new Response(
      JSON.stringify(transformedProducts),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in wc-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});