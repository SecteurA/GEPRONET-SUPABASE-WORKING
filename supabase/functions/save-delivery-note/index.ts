import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface DeliveryNoteLineItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: number;
  vat_amount: number;
}

interface DeliveryNoteData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  notes: string;
  line_items: DeliveryNoteLineItem[];
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
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

    const deliveryNoteData: DeliveryNoteData = await req.json();

    // Validate required fields
    if (!deliveryNoteData.customer_name || !deliveryNoteData.line_items || deliveryNoteData.line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Customer name and line items are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get WooCommerce settings for price validation
    const { data: wcSettings, error: wcSettingsError } = await supabase
      .from('wc_settings')
      .select('*')
      .single();

    // Helper function to get current WooCommerce product pricing
    const getWooCommerceProductPricing = async (productId: string) => {
      if (!wcSettings || wcSettingsError) return null;
      
      try {
        const wcAuth = btoa(`${wcSettings.consumer_key}:${wcSettings.consumer_secret}`);
        const response = await fetch(`${wcSettings.api_url}/products/${productId}`, {
          headers: {
            'Authorization': `Basic ${wcAuth}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const product = await response.json();
          return {
            price: parseFloat(product.regular_price || product.price || '0'),
            tax_class: product.tax_class || '',
          };
        }
      } catch (error) {
        console.error(`Error fetching WooCommerce product ${productId}:`, error);
      }
      
      return null;
    };

    // Helper function to calculate VAT percentage from tax class
    const getVATPercentageFromTaxClass = (taxClass: string): number => {
      if (!taxClass || taxClass.toLowerCase().includes('exonerer') || taxClass === 'zero-rate') {
        return 0;
      }
      
      // Handle percentage strings like "20%" or "10%"
      const percentageMatch = taxClass.match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentageMatch) {
        return parseFloat(percentageMatch[1]);
      }
      
      // Handle common WooCommerce tax class names
      const normalizedTaxClass = taxClass.toLowerCase().trim();
      switch (normalizedTaxClass) {
        case 'standard':
          return 20; // Standard VAT rate in Morocco
        case 'reduced-rate':
        case 'reduced':
          return 10; // Reduced VAT rate
        case 'zero-rate':
        case 'zero':
          return 0;
        default:
          // Try to extract number from string
          const numberMatch = taxClass.match(/(\d+(?:\.\d+)?)/);
          return numberMatch ? parseFloat(numberMatch[1]) : 20; // Default to 20% if can't parse
      }
    };

    // Validate and enhance pricing data for line items
    const enhancedLineItems = [];
    for (const item of deliveryNoteData.line_items) {
      let unitPriceHT = parseFloat(item.unit_price_ht || 0);
      let totalHT = parseFloat(item.total_ht || 0);
      let vatPercentage = parseFloat(item.vat_percentage || 0);
      let vatAmount = parseFloat(item.vat_amount || 0);
      const quantity = parseInt(item.quantity || 1);

      // If pricing data is missing or zero, fetch from WooCommerce
      const hasPricingData = unitPriceHT > 0 || totalHT > 0;
      
      if (!hasPricingData && item.product_id) {
        console.log(`Fetching WooCommerce pricing for product ${item.product_id}`);
        const wcPricing = await getWooCommerceProductPricing(item.product_id);
        
        if (wcPricing && wcPricing.price > 0) {
          // Calculate VAT percentage from tax class
          const calculatedVatPercentage = getVATPercentageFromTaxClass(wcPricing.tax_class);
          
          // WooCommerce prices are typically TTC (include VAT), so we need to calculate HT
          const priceTTC = wcPricing.price;
          const calculatedUnitPriceHT = calculatedVatPercentage > 0 
            ? priceTTC / (1 + calculatedVatPercentage / 100) 
            : priceTTC;
          
          const calculatedTotalHT = calculatedUnitPriceHT * quantity;
          const calculatedVatAmount = calculatedTotalHT * (calculatedVatPercentage / 100);
          
          unitPriceHT = calculatedUnitPriceHT;
          totalHT = calculatedTotalHT;
          vatPercentage = calculatedVatPercentage;
          vatAmount = calculatedVatAmount;
          
          console.log(`Updated pricing for ${item.product_name}: ${unitPriceHT.toFixed(2)} DH HT, ${vatPercentage}% VAT`);
        }
      } else if (hasPricingData) {
        // Ensure consistency in calculations if we have some pricing data
        if (unitPriceHT > 0 && quantity > 0) {
          const calculatedTotal = unitPriceHT * quantity;
          const calculatedVat = calculatedTotal * (vatPercentage / 100);
          
          if (Math.abs(totalHT - calculatedTotal) > 0.01) {
            totalHT = calculatedTotal;
            vatAmount = calculatedVat;
          }
        } else if (totalHT > 0 && quantity > 0) {
          unitPriceHT = totalHT / quantity;
          vatAmount = totalHT * (vatPercentage / 100);
        }
      }

      enhancedLineItems.push({
        product_id: item.product_id,
        product_sku: item.product_sku || '',
        product_name: item.product_name,
        quantity: quantity,
        unit_price_ht: Math.round(unitPriceHT * 100) / 100,
        total_ht: Math.round(totalHT * 100) / 100,
        vat_percentage: vatPercentage,
        vat_amount: Math.round(vatAmount * 100) / 100,
      });
    }

    // Recalculate totals with enhanced pricing
    const calculatedSubtotalHT = enhancedLineItems.reduce((sum, item) => sum + item.total_ht, 0);
    const calculatedTotalVAT = enhancedLineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const calculatedTotalTTC = calculatedSubtotalHT + calculatedTotalVAT;

    // Generate delivery note number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('delivery_note_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('delivery_note_settings')
        .insert({
          prefix: 'BL',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create delivery note settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate delivery note number
    const deliveryNoteNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Insert delivery note with calculated totals
    const { data: deliveryNote, error: deliveryNoteError } = await supabase
      .from('delivery_notes')
      .insert({
        delivery_note_number: deliveryNoteNumber,
        customer_name: deliveryNoteData.customer_name,
        customer_email: deliveryNoteData.customer_email || '',
        customer_phone: deliveryNoteData.customer_phone || '',
        customer_address: deliveryNoteData.customer_address || '',
        delivery_date: deliveryNoteData.delivery_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: deliveryNoteData.notes || '',
        subtotal_ht: Math.round(calculatedSubtotalHT * 100) / 100,
        total_vat: Math.round(calculatedTotalVAT * 100) / 100,
        total_ttc: Math.round(calculatedTotalTTC * 100) / 100,
      })
      .select()
      .single();

    if (deliveryNoteError) {
      console.error('Delivery note creation error:', deliveryNoteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create delivery note' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert enhanced line items
    const lineItemsData = enhancedLineItems.map(item => ({
      delivery_note_id: deliveryNote.id,
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
      .from('delivery_note_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      console.error('Line items creation error:', lineItemsError);
      // Delete the delivery note if line items failed
      await supabase.from('delivery_notes').delete().eq('id', deliveryNote.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create delivery note line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update delivery note settings to increment the counter
    await supabase
      .from('delivery_note_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Delivery note created successfully with pricing data',
        delivery_note: {
          ...deliveryNote,
          line_items: lineItemsData,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-delivery-note function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});