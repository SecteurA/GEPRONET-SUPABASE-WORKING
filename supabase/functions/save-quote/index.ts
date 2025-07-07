import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface QuoteLineItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: number;
  vat_amount: number;
}

interface QuoteData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  quote_date: string;
  valid_until_date: string;
  notes: string;
  line_items: QuoteLineItem[];
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

    const quoteData: QuoteData = await req.json();

    // Validate required fields
    if (!quoteData.customer_name || !quoteData.line_items || quoteData.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Customer name and line items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate totals
    const subtotalHT = quoteData.line_items.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = quoteData.line_items.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalTTC = subtotalHT + totalVAT;

    // Generate quote number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('quote_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('quote_settings')
        .insert({
          prefix: 'DV',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create quote settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate quote number
    const quoteNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Insert quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        customer_name: quoteData.customer_name,
        customer_email: quoteData.customer_email || '',
        customer_phone: quoteData.customer_phone || '',
        customer_address: quoteData.customer_address || '',
        quote_date: quoteData.quote_date || new Date().toISOString().split('T')[0],
        valid_until_date: quoteData.valid_until_date || null,
        status: 'draft',
        subtotal_ht: subtotalHT,
        total_vat: totalVAT,
        total_ttc: totalTTC,
        notes: quoteData.notes || '',
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Quote creation error:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create quote' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert line items
    const lineItemsData = quoteData.line_items.map(item => ({
      quote_id: quote.id,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ht: item.unit_price_ht,
      total_ht: item.total_ht,
      vat_percentage: item.vat_percentage,
      vat_amount: item.vat_amount,
    }));

    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      console.error('Line items creation error:', lineItemsError);
      // Delete the quote if line items failed
      await supabase.from('quotes').delete().eq('id', quote.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create quote line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update quote settings to increment the counter
    await supabase
      .from('quote_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote created successfully',
        quote: {
          ...quote,
          line_items: lineItemsData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-quote function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});