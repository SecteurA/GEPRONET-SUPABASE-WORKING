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
    
    // Get URL parameters for search
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    
    let allProducts;
    
    if (search) {
      // Optimize search to use a single API call with more efficient parameters
      let queryParams = new URLSearchParams({
        status: 'publish',
        per_page: '20', // Limit results to improve performance
      });
      
      // For SKU-like searches, use sku parameter which is more efficient
      if (search.length <= 20 && /^[a-zA-Z0-9\-_]+$/.test(search)) {
        queryParams.append('sku', search);
      } else {
        queryParams.append('search', search);
      }
      
      const nameSearchUrl = `${settings.api_url}/products?${queryParams.toString()}`;
      console.log(`Searching WooCommerce with URL: ${nameSearchUrl}`);
      
      const nameResponse = await fetch(nameSearchUrl, {
        headers: {
          'Authorization': `Basic ${wcAuth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!nameResponse.ok) {
        const errorText = await nameResponse.text();
        console.error('WooCommerce API Error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch products from WooCommerce' }),
          {
            status: nameResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      allProducts = await nameResponse.json();
    } else {
      // No search term, get regular products
      const wcUrl = `${settings.api_url}/products?per_page=20&status=publish`;
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
      
      allProducts = await wcResponse.json();
    }

    let taxRates = [];
    
    try {
      // Only fetch tax rates if we have products
      if (allProducts && allProducts.length > 0) {
        const taxRatesResponse = await fetch(`${settings.api_url}/taxes?per_page=100`, {
          headers: {
            'Authorization': `Basic ${wcAuth}`,
            'Content-Type': 'application/json',
          },
        });

        if (taxRatesResponse.ok) {
          taxRates = await taxRatesResponse.json();
        }
      }
    } catch (taxError) {
      console.error('Error fetching tax rates:', taxError);
      // Continue without tax rates if there's an error
    }

    // Transform products to include only necessary fields
    const transformedProducts = allProducts.map((product: any) => ({
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
      tax_rates: taxRates,
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