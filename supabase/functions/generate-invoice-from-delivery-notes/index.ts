import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface GenerateInvoiceRequest {
  delivery_note_ids: string[];
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

    const { delivery_note_ids }: GenerateInvoiceRequest = await req.json();

    if (!delivery_note_ids || delivery_note_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Delivery note IDs are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch delivery notes
    const { data: deliveryNotes, error: deliveryNotesError } = await supabase
      .from('delivery_notes')
      .select('*')
      .in('id', delivery_note_ids)
      .eq('invoiced', false); // Only non-invoiced delivery notes

    if (deliveryNotesError || !deliveryNotes || deliveryNotes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid delivery notes found or they have already been invoiced' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if all delivery notes belong to the same customer
    const customerNames = [...new Set(deliveryNotes.map(dn => dn.customer_name))];
    if (customerNames.length > 1) {
      return new Response(
        JSON.stringify({ error: 'All delivery notes must belong to the same customer' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch line items for all delivery notes
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('delivery_note_line_items')
      .select('*')
      .in('delivery_note_id', delivery_note_ids);

    if (lineItemsError || !lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No line items found for the delivery notes' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing ${lineItems.length} line items from delivery notes`);

    // Log the line items to see what data we have
    lineItems.forEach(item => {
      console.log(`Line item: ${item.product_name}, unit_price_ht: ${item.unit_price_ht}, vat_percentage: ${item.vat_percentage}, total_ht: ${item.total_ht}`);
    });

    // Group line items by product and sum quantities and amounts
    const productMap = new Map();
    lineItems.forEach(item => {
      const key = item.product_id;
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        // When consolidating, sum quantities and totals
        const newQuantity = existing.quantity + item.quantity;
        const newTotalHT = existing.total_ht + item.total_ht;
        const newVatAmount = existing.vat_amount + item.vat_amount;
        
        // Update the existing item
        existing.quantity = newQuantity;
        existing.total_ht = Math.round(newTotalHT * 100) / 100;
        existing.vat_amount = Math.round(newVatAmount * 100) / 100;
        // Recalculate unit price based on new totals
        existing.unit_price_ht = Math.round((newTotalHT / newQuantity) * 100) / 100;
        
        console.log(`Consolidated ${item.product_name}: qty=${newQuantity}, total_ht=${existing.total_ht}, vat=${existing.vat_amount}`);
      } else {
        // Ensure we have valid numeric values
        const unitPriceHT = parseFloat(item.unit_price_ht) || 0;
        const totalHT = parseFloat(item.total_ht) || 0;
        const vatPercentage = parseFloat(item.vat_percentage) || 0;
        const vatAmount = parseFloat(item.vat_amount) || 0;
        
        console.log(`Adding ${item.product_name}: qty=${item.quantity}, unit_price_ht=${unitPriceHT}, vat_percentage=${vatPercentage}, total_ht=${totalHT}`);
        
        productMap.set(key, {
          product_id: item.product_id,
          product_sku: item.product_sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_ht: unitPriceHT,
          total_ht: totalHT,
          vat_percentage: vatPercentage,
          vat_amount: vatAmount,
        });
      }
    });

    // Convert map to array
    const consolidatedLineItems = Array.from(productMap.values());
    
    console.log(`Consolidated to ${consolidatedLineItems.length} unique products:`);
    consolidatedLineItems.forEach(item => {
      console.log(`  - ${item.product_name}: qty=${item.quantity}, unit_price_ht=${item.unit_price_ht}, vat_percentage=${item.vat_percentage}%`);
    });

    // Use the first delivery note for customer information
    const primaryDeliveryNote = deliveryNotes[0];

    // Generate invoice number
    const currentYear = new Date().getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('invoice_settings')
        .insert({
          prefix: 'FA',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create invoice settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate invoice number
    const invoiceNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(3, '0')}`;

    // Calculate totals from consolidated line items
    const subtotalHT = consolidatedLineItems.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = consolidatedLineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalTTC = subtotalHT + totalVAT;

    console.log(`Invoice totals: subtotal_ht=${subtotalHT}, total_vat=${totalVAT}, total_ttc=${totalTTC}`);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_name: primaryDeliveryNote.customer_name,
        customer_email: primaryDeliveryNote.customer_email || '',
        customer_phone: primaryDeliveryNote.customer_phone || '',
        customer_address: primaryDeliveryNote.customer_address || '',
        invoice_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal_ht: Math.round(subtotalHT * 100) / 100,
        total_vat: Math.round(totalVAT * 100) / 100,
        total_ttc: Math.round(totalTTC * 100) / 100,
        notes: `Facture générée à partir des bons de livraison: ${deliveryNotes.map(dn => dn.delivery_note_number).join(', ')}`,
        source: 'delivery_notes',
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invoice' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert invoice line items with consolidated data
    const lineItemsData = consolidatedLineItems.map(item => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      product_sku: item.product_sku || '',
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ht: item.unit_price_ht,
      total_ht: item.total_ht,
      vat_percentage: item.vat_percentage,
      vat_amount: item.vat_amount,
    }));

    const { error: lineItemsInsertError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsData);

    if (lineItemsInsertError) {
      console.error('Line items creation error:', lineItemsInsertError);
      // Delete the invoice if line items failed
      await supabase.from('invoices').delete().eq('id', invoice.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create invoice line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update delivery notes to mark as invoiced and link to invoice
    const { error: updateDeliveryNotesError } = await supabase
      .from('delivery_notes')
      .update({
        invoiced: true,
        invoice_id: invoice.id,
        status: 'invoiced',
        updated_at: new Date().toISOString(),
      })
      .in('id', delivery_note_ids);

    if (updateDeliveryNotesError) {
      console.error('Error updating delivery notes:', updateDeliveryNotesError);
      // Don't fail the entire operation, but log the error
    }

    // Update invoice settings to increment the counter
    await supabase
      .from('invoice_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Facture ${invoiceNumber} créée à partir de ${deliveryNotes.length} bon(s) de livraison`,
        invoice: {
          ...invoice,
          line_items: consolidatedLineItems,
          delivery_note_numbers: deliveryNotes.map(dn => dn.delivery_note_number),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-invoice-from-delivery-notes function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});