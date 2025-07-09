import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CreateSalesJournalRequest {
  journal_date: string;
}

Deno.serve(async (req: Request) => {
  console.log('🚀 Sales journal function started');
  
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      console.log('❌ Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Initializing Supabase client...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('📦 Parsing request body...');
    const { journal_date }: CreateSalesJournalRequest = await req.json();

    if (!journal_date) {
      console.log('❌ Missing journal_date');
      return new Response(
        JSON.stringify({ error: 'Journal date is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📅 Processing journal for date:', journal_date);

    // Step 1: Check if journal already exists
    console.log('🔍 Checking for existing journal...');
    const { data: existingJournal, error: existingError } = await supabase
      .from('sales_journals')
      .select('id')
      .eq('journal_date', journal_date)
      .maybeSingle();

    if (existingError) {
      console.error('❌ Error checking existing journal:', existingError);
      return new Response(
        JSON.stringify({ error: 'Database error checking existing journal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingJournal) {
      console.log('⚠️ Journal already exists');
      return new Response(
        JSON.stringify({ error: 'Un journal de vente existe déjà pour cette date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check cash control
    console.log('💰 Checking cash control...');
    const { data: cashControl, error: cashError } = await supabase
      .from('cash_controls')
      .select('id')
      .eq('control_date', journal_date)
      .eq('status', 'closed')
      .maybeSingle();

    if (cashError) {
      console.error('❌ Error checking cash control:', cashError);
      return new Response(
        JSON.stringify({ error: 'Error checking cash control' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cashControl) {
      console.log('⚠️ No cash control found');
      return new Response(
        JSON.stringify({ error: 'La caisse doit être clôturée avant de pouvoir générer le journal de vente pour cette date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get paid invoices
    console.log('📋 Fetching paid invoices...');
    const { data: paidInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, total_ttc')
      .eq('status', 'paid')
      .eq('paid_date', journal_date)
      .neq('source', 'order'); // Exclude invoices generated from orders to avoid duplication

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return new Response(
        JSON.stringify({ error: 'Error fetching paid invoices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${paidInvoices?.length || 0} paid invoices`);

    // Step 4: Get completed orders
    console.log('🛒 Fetching completed orders...');
    const startOfDay = new Date(journal_date);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const { data: completedOrders, error: ordersError } = await supabase
      .from('wc_orders')
      .select('order_id, total_amount')
      .eq('order_status', 'completed')
      .gte('order_date', startOfDay.toISOString())
      .lt('order_date', endOfDay.toISOString());

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Error fetching completed orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${completedOrders?.length || 0} completed orders`);

    // Check if we have data to process
    if ((!paidInvoices || paidInvoices.length === 0) && (!completedOrders || completedOrders.length === 0)) {
      console.log('⚠️ No data to process');
      return new Response(
        JSON.stringify({ error: 'Aucune facture payée ou commande terminée trouvée pour cette date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Get line items
    console.log('📝 Fetching line items...');
    let allLineItems: any[] = [];

    // Get invoice line items
    if (paidInvoices && paidInvoices.length > 0) {
      const invoiceIds = paidInvoices.map(inv => inv.id);
      const { data: invoiceItems, error: invoiceItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .in('invoice_id', invoiceIds);

      if (invoiceItemsError) {
        console.error('❌ Error fetching invoice line items:', invoiceItemsError);
        return new Response(
          JSON.stringify({ error: 'Error fetching invoice line items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (invoiceItems) {
        allLineItems.push(...invoiceItems.map(item => ({
          ...item,
          source: 'invoice'
        })));
      }
    }

    // Get order line items
    if (completedOrders && completedOrders.length > 0) {
      const orderIds = completedOrders.map(order => order.order_id);
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('wc_order_line_items')
        .select('*')
        .in('order_id', orderIds);

      if (orderItemsError) {
        console.error('❌ Error fetching order line items:', orderItemsError);
        return new Response(
          JSON.stringify({ error: 'Error fetching order line items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (orderItems) {
        allLineItems.push(...orderItems.map(item => ({
          ...item,
          source: 'order',
          unit_price_ht: item.price || 0,
          total_ht: item.subtotal || 0,
          vat_percentage: calculateVATPercentage(item.tax_class || ''),
          vat_amount: item.tax_total || 0
        })));
      }
    }

    console.log(`📊 Processing ${allLineItems.length} line items`);

    if (allLineItems.length === 0) {
      console.log('⚠️ No line items found');
      return new Response(
        JSON.stringify({ error: 'Aucun article trouvé pour cette date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6.5: Consolidate line items by product
    console.log('📦 Consolidating line items by product...');
    const consolidatedItems = new Map();
    
    allLineItems.forEach(item => {
      const key = `${item.product_id || 'unknown'}-${item.product_sku || 'no-sku'}`;
      
      if (consolidatedItems.has(key)) {
        // Product already exists, sum the quantities and amounts
        const existing = consolidatedItems.get(key);
        const newQuantity = existing.quantity + (parseInt(item.quantity) || 1);
        const newTotalHT = existing.total_ht + (parseFloat(item.total_ht) || 0);
        const newVatAmount = existing.vat_amount + (parseFloat(item.vat_amount) || 0);
        
        // Update existing item
        existing.quantity = newQuantity;
        existing.total_ht = newTotalHT;
        existing.vat_amount = newVatAmount;
        existing.unit_price_ht = newTotalHT / newQuantity; // Recalculate unit price
        
        console.log(`🔄 Consolidated ${item.product_name}: ${newQuantity} units, ${newTotalHT.toFixed(2)} DH HT`);
      } else {
        // New product, add to map
        const consolidatedItem = {
          product_id: item.product_id || 'unknown',
          product_sku: item.product_sku || '',
          product_name: item.product_name || 'Unknown Product',
          quantity: parseInt(item.quantity) || 1,
          unit_price_ht: parseFloat(item.unit_price_ht) || 0,
          total_ht: parseFloat(item.total_ht) || 0,
          vat_percentage: parseFloat(item.vat_percentage) || 0,
          vat_amount: parseFloat(item.vat_amount) || 0,
        };
        
        consolidatedItems.set(key, consolidatedItem);
        console.log(`➕ Added ${item.product_name}: ${consolidatedItem.quantity} units, ${consolidatedItem.total_ht.toFixed(2)} DH HT`);
      }
    });
    
    // Convert map to array
    const consolidatedLineItems = Array.from(consolidatedItems.values());
    console.log(`📊 Consolidated ${allLineItems.length} line items into ${consolidatedLineItems.length} unique products`);
    // Step 7: Generate journal number
    console.log('🔢 Generating journal number...');
    const currentYear = new Date(journal_date).getFullYear();
    
    let { data: settings, error: settingsError } = await supabase
      .from('sales_journal_settings')
      .select('*')
      .eq('year', currentYear)
      .maybeSingle();

    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings) {
      console.log('📝 Creating new settings...');
      const { data: newSettings, error: createError } = await supabase
        .from('sales_journal_settings')
        .insert({
          prefix: 'FG',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating settings:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      settings = newSettings;
    }

    const journalNumber = `${settings.prefix}${currentYear}${settings.current_number.toString().padStart(4, '0')}`;
    console.log('📋 Generated journal number:', journalNumber);

    // Step 8: Calculate totals from consolidated items
    console.log('🧮 Calculating totals...');
    const totalHT = consolidatedLineItems.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = consolidatedLineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalTTC = totalHT + totalVAT;

    console.log(`💰 Totals: HT=${totalHT}, VAT=${totalVAT}, TTC=${totalTTC}`);

    // Step 9: Create journal
    console.log('📝 Creating journal...');
    const { data: journal, error: journalError } = await supabase
      .from('sales_journals')
      .insert({
        journal_number: journalNumber,
        journal_date: journal_date,
        total_ht: Math.round(totalHT * 100) / 100,
        total_vat: Math.round(totalVAT * 100) / 100,
        total_ttc: Math.round(totalTTC * 100) / 100,
        status: 'finalized',
      })
      .select()
      .single();

    if (journalError) {
      console.error('❌ Error creating journal:', journalError);
      return new Response(
        JSON.stringify({ error: 'Failed to create journal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Journal created with ID:', journal.id);

    // Step 10: Create consolidated line items
    console.log('📝 Creating line items...');
    const journalLineItems = consolidatedLineItems.map(item => ({
      journal_id: journal.id,
      order_id: 'CONSOLIDATED', // Since we consolidated from multiple sources
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ht: Math.round(item.unit_price_ht * 100) / 100,
      total_ht: Math.round(item.total_ht * 100) / 100,
      vat_percentage: item.vat_percentage,
      vat_amount: Math.round(item.vat_amount * 100) / 100,
    }));

    const { error: lineItemsError } = await supabase
      .from('sales_journal_line_items')
      .insert(journalLineItems);

    if (lineItemsError) {
      console.error('❌ Error creating line items:', lineItemsError);
      // Clean up - delete the journal
      await supabase.from('sales_journals').delete().eq('id', journal.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create line items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Created', journalLineItems.length, 'line items');

    // Step 11: Update settings
    console.log('🔄 Updating settings...');
    await supabase
      .from('sales_journal_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    console.log('✅ Sales journal created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Journal de vente ${journalNumber} créé avec succès`,
        journal: journal,
        stats: {
          invoices_count: paidInvoices?.length || 0,
          orders_count: completedOrders?.length || 0,
          line_items_count: journalLineItems.length,
          original_line_items_count: allLineItems.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error.message}`,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to calculate VAT percentage
function calculateVATPercentage(taxClass: string): number {
  if (!taxClass || taxClass.toLowerCase().includes('exonerer')) {
    return 0;
  }
  
  const percentageMatch = taxClass.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentageMatch) {
    return parseFloat(percentageMatch[1]);
  }
  
  const normalizedTaxClass = taxClass.toLowerCase().trim();
  switch (normalizedTaxClass) {
    case 'standard':
      return 20;
    case 'reduced-rate':
    case 'reduced':
      return 10;
    case 'zero-rate':
    case 'zero':
      return 0;
    default:
      const numberMatch = taxClass.match(/(\d+(?:\.\d+)?)/);
      return numberMatch ? parseFloat(numberMatch[1]) : 0;
  }
}