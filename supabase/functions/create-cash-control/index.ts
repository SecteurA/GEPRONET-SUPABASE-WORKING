import { createClient } from 'npm:@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CreateCashControlRequest {
  control_date: string;
  notes?: string;
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { control_date, notes }: CreateCashControlRequest = await req.json();

    if (!control_date) {
      return new Response(
        JSON.stringify({ error: 'Control date is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cash control already exists for this date
    const { data: existingControl } = await supabase
      .from('cash_controls')
      .select('*')
      .eq('control_date', control_date)
      .single();

    if (existingControl) {
      return new Response(
        JSON.stringify({ error: 'Un contrôle de caisse existe déjà pour cette date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get paid invoices for the specified date
    const { data: paidInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'paid')
      .eq('paid_date', control_date)
      .neq('source', 'order'); // Exclude invoices generated from orders to avoid duplication

    if (invoicesError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des factures payées' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get completed WooCommerce orders for the specified date
    const { data: completedOrders, error: ordersError } = await supabase
      .from('wc_orders')
      .select('*')
      .eq('order_status', 'completed')
      .gte('updated_at', control_date)
      .lt('updated_at', new Date(new Date(control_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (ordersError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des commandes terminées' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate totals from invoices (assume all invoices are cash unless specified otherwise)
    let invoiceCashTotal = 0;
    let invoiceTransferTotal = 0;
    let invoiceCheckTotal = 0;

    (paidInvoices || []).forEach(invoice => {
      const paymentMethod = invoice.payment_method;
      if (paymentMethod === 'Virements') {
        invoiceTransferTotal += invoice.total_ttc;
      } else if (paymentMethod === 'Chèque') {
        invoiceCheckTotal += invoice.total_ttc;
      } else {
        // Default to cash if no payment method or if payment method is 'Espèces'
        invoiceCashTotal += invoice.total_ttc;
      }
    });

    // Calculate totals from WooCommerce orders based on payment method
    let orderCashTotal = 0;
    let orderTransferTotal = 0;
    let orderCheckTotal = 0; // WooCommerce orders don't typically have check payments

    (completedOrders || []).forEach(order => {
      const paymentMethod = (order.payment_method || '').toLowerCase();
      if (paymentMethod.includes('bank transfer') || paymentMethod.includes('virement')) {
        orderTransferTotal += order.total_amount;
      } else if (paymentMethod.includes('check') || paymentMethod.includes('chèque')) {
        orderCheckTotal += order.total_amount;
      } else {
        orderCashTotal += order.total_amount;
      }
    });

    // Calculate final totals
    const totalCash = invoiceCashTotal + orderCashTotal;
    const totalTransfer = invoiceTransferTotal + orderTransferTotal;
    const totalCheck = invoiceCheckTotal + orderCheckTotal;
    const totalAmount = totalCash + totalTransfer + totalCheck;

    // Generate control number
    const currentYear = new Date(control_date).getFullYear();
    
    // Get or create settings for current year
    let { data: settings, error: settingsError } = await supabase
      .from('cash_control_settings')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (settingsError || !settings) {
      // Create settings for current year
      const { data: newSettings, error: createError } = await supabase
        .from('cash_control_settings')
        .insert({
          prefix: 'CC',
          year: currentYear,
          current_number: 1,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create cash control settings' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      settings = newSettings;
    }

    // Generate control number
    const controlNumber = `${settings.prefix}-${currentYear}-${settings.current_number.toString().padStart(4, '0')}`;

    // Create cash control
    const { data: cashControl, error: controlError } = await supabase
      .from('cash_controls')
      .insert({
        control_number: controlNumber,
        control_date: control_date,
        cash_total: totalCash,
        transfer_total: totalTransfer,
        check_total: totalCheck,
        total_amount: totalAmount,
        status: 'closed',
        notes: notes || '',
      })
      .select()
      .single();

    if (controlError) {
      console.error('Cash control creation error:', controlError);
      return new Response(
        JSON.stringify({ error: 'Failed to create cash control' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update settings to increment the counter
    await supabase
      .from('cash_control_settings')
      .update({ 
        current_number: settings.current_number + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contrôle de caisse ${controlNumber} créé avec succès`,
        cash_control: cashControl,
        stats: {
          invoices_count: paidInvoices?.length || 0,
          orders_count: completedOrders?.length || 0,
          cash_total: totalCash,
          transfer_total: totalTransfer,
          check_total: totalCheck,
          total_amount: totalAmount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-cash-control function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});