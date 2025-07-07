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
    const search = url.searchParams.get('search')?.trim() || '';
    const skipCache = url.searchParams.get('skip_cache') === 'true';
    
    // Check cache freshness
    const { data: lastSync } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'wc_products_last_sync')
      .single();
    
    const lastSyncTime = lastSync?.value ? new Date(lastSync.value as string) : null;
    const now = new Date();
    const cacheFreshThresholdHours = 24; // Consider cache fresh if updated within 24 hours
    const isCacheFresh = lastSyncTime && 
      ((now.getTime() - new Date(lastSyncTime as string).getTime()) / (1000 * 60 * 60)) < cacheFreshThresholdHours;
    
    // If cache is stale, trigger a background sync but don't wait for it
    if (!isCacheFresh && !skipCache) {
      console.log('Cache is stale, triggering background sync...');
      fetch(`${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/sync-wc-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
          'Content-Type': 'application/json',
        }
      }).catch(err => console.error('Error triggering background sync:', err));
    }
    
    // Use cache if search term exists and we're not explicitly skipping the cache
    if (search.length >= 2 && !skipCache) {
      console.log(`Searching products in cache for: "${search}"`);
      
      // Query the cache
      let query = supabase
        .from('wc_products_cache')
        .select('*');
        
      // Apply search filter
      const searchLower = search.toLowerCase();
      query = query.or(
        `name.ilike.%${searchLower}%,sku.ilike.%${searchLower}%`
      );
      
      // Limit the results
      query = query.limit(50);
      
      const { data: cacheProducts, error: cacheError } = await query;
      
      if (!cacheError && cacheProducts && cacheProducts.length > 0) {
        console.log(`Found ${cacheProducts.length} products in cache`);
        
        // Get tax rates from settings
        const { data: taxRatesData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'wc_tax_rates')
          .single();
          
        const taxRates = taxRatesData?.value ? JSON.parse(taxRatesData.value as string) : [];
        
        // Sort results with exact matches at the top
        const searchPattern = new RegExp(`^${searchLower}`, 'i');
        cacheProducts.sort((a, b) => {
          const aNameMatch = a.name.toLowerCase().match(searchPattern) ? -1 : 0;
          const bNameMatch = b.name.toLowerCase().match(searchPattern) ? -1 : 0;
          
          if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
          
          const aSkuMatch = (a.sku || '').toLowerCase().match(searchPattern) ? -1 : 0;
          const bSkuMatch = (b.sku || '').toLowerCase().match(searchPattern) ? -1 : 0;
          
          return aSkuMatch - bSkuMatch;
        });
        
        // Transform products for response
        const transformedProducts = cacheProducts.map(product => ({
          id: parseInt(product.id),
          name: product.name,
          sku: product.sku || '',
          price: product.price.toString(),
          regular_price: product.regular_price.toString(),
          tax_class: product.tax_class || '',
          categories: typeof product.categories === 'string' 
            ? JSON.parse(product.categories) 
            : (product.categories || []),
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
      } else {
        console.log('No results found in cache, falling back to WooCommerce API');
        if (cacheError) {
          console.error('Cache query error:', cacheError);
        }
      }
    }
    
    let allProducts = [];
    
    if (search) {
      // First search by product name
      const nameSearchUrl = `${settings.api_url}/products?search=${encodeURIComponent(search)}&status=publish&per_page=50`;
      console.log(`Searching products by name: ${nameSearchUrl}`);
      
      const nameResponse = await fetch(nameSearchUrl, {
        headers: {
          'Authorization': `Basic ${wcAuth}`,
          'Content-Type': 'application/json',
        },
      });

      
      // Get results from name search
      if (nameResponse.ok) {
        const nameResults = await nameResponse.json();
        console.log(`Found ${nameResults.length} products by name`);
        allProducts = [...nameResults];
      }
      
      // Then search by SKU (separate request for better matching)
      if (search.length <= 20) {
        const skuSearchUrl = `${settings.api_url}/products?sku=${encodeURIComponent(search)}&status=publish&per_page=20`;
        console.log(`Searching products by SKU: ${skuSearchUrl}`);
        
        const skuResponse = await fetch(skuSearchUrl, {
          headers: {
            'Authorization': `Basic ${wcAuth}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (skuResponse.ok) {
          const skuResults = await skuResponse.json();
          console.log(`Found ${skuResults.length} products by exact SKU`);
          
          // Add SKU results that aren't already in the array
          skuResults.forEach(skuProduct => {
            if (!allProducts.some(p => p.id === skuProduct.id)) {
              allProducts.push(skuProduct);
            }
          });
        }
      }
      
      // Fallback: If no results or very few, get all products and filter client-side
      if (allProducts.length < 2) {
        const allProductsUrl = `${settings.api_url}/products?per_page=100&status=publish`;
        console.log(`Fallback search for all products: ${allProductsUrl}`);
        
        const allResponse = await fetch(allProductsUrl, {
          headers: {
            'Authorization': `Basic ${wcAuth}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (allResponse.ok) {
          const allResults = await allResponse.json();
          // Filter results that contain the search term in the name, SKU or slug
          const searchTermLower = search.toLowerCase();
          const filteredResults = allResults.filter(product => 
            (product.name && product.name.toLowerCase().includes(searchTermLower)) ||
            (product.sku && product.sku.toLowerCase().includes(searchTermLower)) ||
            (product.slug && product.slug.toLowerCase().includes(searchTermLower))
          ).filter(product => !allProducts.some(p => p.id === product.id));
          
          console.log(`Found ${filteredResults.length} additional products through filtering`);
          allProducts = [...allProducts, ...filteredResults];
        }
      }
      
      // If we still have no products, return empty array
      if (allProducts.length === 0) {
        console.log(`No products found matching "${search}"`);
      }
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

    // Sort results with exact matches at the top
    if (search && allProducts.length > 0) {
      const searchLower = search.toLowerCase();
      allProducts.sort((a, b) => {
        const aNameStartsWith = a.name.toLowerCase().startsWith(searchLower) ? -1 : 0;
        const bNameStartsWith = b.name.toLowerCase().startsWith(searchLower) ? -1 : 0;
        return aNameStartsWith - bNameStartsWith;
      });
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