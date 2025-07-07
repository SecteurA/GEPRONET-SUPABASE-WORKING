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

    const { journal_date }: CreateSalesJournalRequest = await req.json();

    if (!journal_date) {
      return new Response(
        JSON.stringify({ error: 'Journal date is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if journal already exists for this date
    const { data: existingJournal } = await supabase
      .from('sales_journals')
      .select('*')
      .eq('journal_date', journal_date)
      .single();

    if (existingJournal) {
      return new Response(
        JSON.stringify({ error: 'Un journal de vente existe déjà pour cette date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get orders for the specified date
    const { data: orders, error: ordersError } = await supabase
      .from('wc_orders')
      .select('*')
      .gte('order_date', journal_date)
      .lt('order_date', new Date(new Date(journal_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('order_date', { ascending: true });

    if (ordersError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des commandes' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucune commande trouvée pour cette date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all line items for these orders
    const orderIds = orders.map(order => order.order_id);
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('wc_order_line_items')
      .select('*')
      .in('order_id', orderIds)
      .order('order_id', { ascending: true });

    if (lineItemsError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des articles' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun article trouvé pour les commandes de cette date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate journal number
    const currentYear = new Date(journal_date).getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('sales_journal_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
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
        return new Response(
          JSON.stringify({ error: 'Failed to create sales journal settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate journal number
    const journalNumber = `${settings.prefix}${currentYear}${settings.current_number.toString().padStart(4, '0')}`;

    // Calculate totals
    const totalHT = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalVAT = lineItems.reduce((sum, item) => sum + item.tax_total, 0);
    const totalTTC = totalHT + totalVAT;

    // Create sales journal
    const { data: journal, error: journalError } = await supabase
      .from('sales_journals')
      .insert({
        journal_number: journalNumber,
        journal_date: journal_date,
        total_ht: totalHT,
        total_vat: totalVAT,
        total_ttc: totalTTC,
        status: 'finalized',
      })
      .select()
      .single();

    if (journalError) {
      console.error('Journal creation error:', journalError);
      return new Response(
        JSON.stringify({ error: 'Failed to create sales journal' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Helper function to calculate VAT percentage from tax class
    const calculateVATPercentage = (taxClass: string): number => {
      if (!taxClass || taxClass.toLowerCase().includes('exonerer')) {
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
          return numberMatch ? parseFloat(numberMatch[1]) : 0;
      }
    };

    // Create journal line items
    const journalLineItems = lineItems.map(item => ({
      journal_id: journal.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_sku: item.product_sku || '',
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ht: item.price,
      total_ht: item.subtotal,
      vat_percentage: calculateVATPercentage(item.tax_class || ''),
      vat_amount: item.tax_total,
    }));

    const { error: lineItemsInsertError } = await supabase
      .from('sales_journal_line_items')
      .insert(journalLineItems);

    if (lineItemsInsertError) {
      console.error('Line items creation error:', lineItemsInsertError);
      // Delete the journal if line items failed
      await supabase.from('sales_journals').delete().eq('id', journal.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create journal line items' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update settings to increment the counter
    await supabase
      .from('sales_journal_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Journal de vente ${journalNumber} créé avec succès`,
        journal: {
          ...journal,
          line_items: journalLineItems,
        },
        stats: {
          orders_count: orders.length,
          line_items_count: lineItems.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-sales-journal function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});