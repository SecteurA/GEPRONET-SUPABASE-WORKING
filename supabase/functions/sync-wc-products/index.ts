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
    
    // Fetch all products with pagination
    const per_page = 100; // Maximum per page
    let page = 1;
    let allProducts = [];
    let hasMore = true;
    
    while (hasMore) {
      const wcUrl = `${settings.api_url}/products?per_page=${per_page}&page=${page}&status=publish`;
      console.log(`Fetching products page ${page}...`);
      
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
      allProducts = [...allProducts, ...products];
      
      // Check if there are more pages
      const totalPages = parseInt(wcResponse.headers.get('X-WP-TotalPages') || '0');
      if (page >= totalPages || products.length === 0) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`Total products fetched: ${allProducts.length}`);
    
    // Fetch tax rates from WooCommerce API
    let taxRates = [];
    try {
      const taxRatesResponse = await fetch(`${settings.api_url}/taxes?per_page=100`, {
        headers: {
          'Authorization': `Basic ${wcAuth}`,
          'Content-Type': 'application/json',
        },
      });

      if (taxRatesResponse.ok) {
        taxRates = await taxRatesResponse.json();
      }
    } catch (taxError) {
      console.error('Error fetching tax rates:', taxError);
      // Continue without tax rates
    }

    // Transform products for database storage
    const transformedProducts = allProducts.map((product: any) => ({
      id: product.id.toString(),
      name: product.name,
      sku: product.sku || '',
      price: parseFloat(product.price || '0'),
      regular_price: parseFloat(product.regular_price || product.price || '0'),
      tax_class: product.tax_class || '',
      categories: JSON.stringify(product.categories || []),
      stock_status: product.stock_status,
      manage_stock: product.manage_stock || false,
      stock_quantity: parseInt(product.stock_quantity || '0'),
      last_synced_at: new Date().toISOString()
    }));

    // Store tax rates in a separate cache table or as a setting
    if (taxRates.length > 0) {
      await supabase
        .from('app_settings')
        .upsert({
          key: 'wc_tax_rates',
          value: JSON.stringify(taxRates),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
    }

    // Clear existing cache and insert new data
    const { error: truncateError } = await supabase
      .from('wc_products_cache')
      .delete()
      .neq('id', '0'); // Delete all records
      
    if (truncateError) {
      console.error('Error clearing cache:', truncateError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear product cache' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Insert products in batches to avoid request size limits
    const batchSize = 100;
    for (let i = 0; i < transformedProducts.length; i += batchSize) {
      const batch = transformedProducts.slice(i, i + batchSize);
      console.log(`Inserting batch ${i / batchSize + 1}/${Math.ceil(transformedProducts.length / batchSize)}...`);
      
      const { error: insertError } = await supabase
        .from('wc_products_cache')
        .insert(batch);
        
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert products into cache' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Update a timestamp in app_settings to track last sync
    await supabase
      .from('app_settings')
      .upsert({
        key: 'wc_products_last_sync',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${transformedProducts.length} products to cache`,
        count: transformedProducts.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sync-wc-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});