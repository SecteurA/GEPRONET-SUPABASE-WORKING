import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WCProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  tax_class: string;
  tax_status: string;
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

    if (req.method === 'POST') {
      const { search_term } = await req.json();

      if (!search_term || search_term.trim().length < 2) {
        return new Response(
          JSON.stringify({ products: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

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

      // Search products from WooCommerce API
      const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
      const searchUrl = `${settings.api_url}/products?search=${encodeURIComponent(search_term)}&per_page=20&status=publish`;
      
      const wcResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${wcAuth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!wcResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to search products from WooCommerce' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const wcProducts: WCProduct[] = await wcResponse.json();

      // Transform products for frontend
      const transformedProducts = wcProducts.map(product => {
        // Determine VAT rate based on tax_class and tax_status
        let vatRate = 20.00; // Default VAT rate
        
        if (product.tax_status === 'none') {
          vatRate = 0.00;
        } else if (product.tax_class) {
          const taxClass = product.tax_class.toLowerCase();
          if (taxClass.includes('exonerer') || taxClass === 'zero-rate') {
            vatRate = 0.00;
          } else if (taxClass.includes('reduced') || taxClass === 'reduced-rate') {
            vatRate = 10.00;
          } else if (taxClass.includes('5.5')) {
            vatRate = 5.5;
          }
        }

        // Get the price (use sale_price if available, otherwise regular_price)
        const price = parseFloat(product.sale_price || product.regular_price || product.price || '0');

        return {
          id: product.id,
          name: product.name,
          sku: product.sku || '',
          price: price,
          vat_rate: vatRate,
          tax_class: product.tax_class || '',
          tax_status: product.tax_status || 'taxable',
        };
      });

      return new Response(
        JSON.stringify({ products: transformedProducts }),
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