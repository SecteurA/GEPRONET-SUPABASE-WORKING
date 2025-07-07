import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
}

interface InvoiceLineItem {
  id?: string;
  product_name: string;
  product_sku: string;
  description: string;
  quantity: number;
  unit_price: number; // HT price
  total_price: number; // HT total
  vat_rate: number; // Individual VAT rate for this item
  vat_amount: number; // VAT amount for this item
}

interface InvoiceFormProps {
  invoice: Invoice | null;
  onSubmit: () => void;
  onCancel: () => void;
  importOrderId?: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onSubmit, onCancel, importOrderId }) => {
  const [formData, setFormData] = useState({
    customer_name: invoice?.customer_name || '',
    customer_email: invoice?.customer_email || '',
    customer_phone: invoice?.customer_phone || '',
    customer_address: invoice?.customer_address || '',
    invoice_date: invoice?.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date?.split('T')[0] || '',
    status: invoice?.status || 'draft',
    notes: invoice?.notes || '',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (invoice) {
      fetchLineItems();
    } else if (importOrderId) {
      importFromOrder();
    } else {
      // Add one empty line item for new invoices
      setLineItems([{
        product_name: '',
        product_sku: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_rate: 20.00,
        vat_amount: 0,
      }]);
    }
  }, [invoice, importOrderId]);

  const fetchLineItems = async () => {
    if (!invoice) return;

    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching line items:', error);
        return;
      }

      if (data && data.length > 0) {
        setLineItems(data.map(item => ({
          ...item,
          vat_rate: item.vat_rate || 20.00,
          vat_amount: item.vat_amount || 0,
        })));
      } else {
        // Add one empty line item if none exist
        setLineItems([{
          product_name: '',
          product_sku: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          vat_rate: 20.00,
          vat_amount: 0,
        }]);
      }
    } catch (err) {
      console.error('Error fetching line items:', err);
    }
  };

  const importFromOrder = async () => {
    if (!importOrderId) return;

    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('wc_orders')
        .select('*')
        .eq('order_id', importOrderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return;
      }

      // Fetch order line items
      const { data: orderLineItems, error: lineItemsError } = await supabase
        .from('wc_order_line_items')
        .select('*')
        .eq('order_id', importOrderId);

      if (lineItemsError) {
        console.error('Error fetching order line items:', lineItemsError);
        return;
      }

      // Populate form with order data
      setFormData(prev => ({
        ...prev,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_address: order.billing_address || order.shipping_address || '',
      }));

      // Convert order line items to invoice line items with VAT calculations
      if (orderLineItems && orderLineItems.length > 0) {
        const convertedItems = orderLineItems.map(item => {
          // Use calculated VAT rate from WooCommerce data or fall back to calculation
          let vatRate = item.calculated_vat_rate || 0.00;
          
          // If we don't have calculated rate, try to determine from tax data
          if (vatRate === 0 && item.subtotal > 0 && item.tax_total > 0) {
            vatRate = Math.round((item.tax_total / item.subtotal) * 100 * 100) / 100;
          }
          
          // If still no rate, fall back to tax class logic
          if (vatRate === 0) {
            if (item.tax_class && item.tax_class.toLowerCase().includes('exonerer')) {
              vatRate = 0.00;
            } else if (item.tax_class && item.tax_class.toLowerCase().includes('reduced')) {
              vatRate = 10.00;
            } else if (item.tax_class && (item.tax_class.toLowerCase().includes('standard') || !item.tax_class)) {
              vatRate = 20.00;
            } else {
              vatRate = 20.00; // Default fallback
            }
          }

          const unitPriceHT = item.price; // WC price should be HT
          const totalPriceHT = item.subtotal; // Subtotal is HT
          const vatAmount = item.tax_total; // Actual tax amount from WC
          return {
            product_name: item.product_name,
            product_sku: item.product_sku || '',
            description: item.product_name,
            quantity: item.quantity,
            unit_price: unitPriceHT,
            total_price: totalPriceHT,
            vat_rate: vatRate,
            vat_amount: vatAmount,
          };
        });
        setLineItems(convertedItems);
      }
    } catch (err) {
      console.error('Error importing from order:', err);
    }
  };

  const searchItems = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wc_order_line_items')
        .select('product_name, product_sku, price, tax_class, subtotal, tax_total')
        .or(`product_name.ilike.%${searchTerm}%,product_sku.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching items:', error);
        return;
      }

      // Remove duplicates and calculate VAT rates
      const uniqueItems = data?.reduce((acc, item) => {
        const key = `${item.product_name}-${item.product_sku}`;
        if (!acc.some(existingItem => `${existingItem.product_name}-${existingItem.product_sku}` === key)) {
          let vatRate = 20.00;
          if (item.tax_class && item.tax_class.toLowerCase().includes('exonerer')) {
            vatRate = 0.00;
          } else if (item.tax_class && item.tax_class.toLowerCase().includes('reduced')) {
            vatRate = 10.00;
          }

          acc.push({
            ...item,
            vat_rate: vatRate,
          });
        }
        return acc;
      }, [] as any[]) || [];

      setSearchResults(uniqueItems);
    } catch (err) {
      console.error('Error searching items:', err);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(itemSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [itemSearch]);

  const generateInvoiceNumber = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('invoice_settings')
        .select('*')
        .single();

      if (settingsError) {
        console.error('Error fetching invoice settings:', settingsError);
        return null;
      }

      const currentYear = new Date().getFullYear();
      let prefix = settings.prefix;
      let year = settings.year;
      let number = settings.current_number;

      // If year has changed, reset number to 1
      if (year !== currentYear) {
        year = currentYear;
        number = 1;
      }

      const invoiceNumber = `${prefix}-${year}${number.toString().padStart(4, '0')}`;

      // Update settings with next number
      await supabase
        .from('invoice_settings')
        .update({
          year,
          current_number: number + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      return invoiceNumber;
    } catch (err) {
      console.error('Error generating invoice number:', err);
      return null;
    }
  };

  const calculateTotals = () => {
    const subtotalHT = lineItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalVAT = lineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const total = subtotalHT + totalVAT;

    // Group VAT by rate
    const vatByRate = lineItems.reduce((acc, item) => {
      const rate = item.vat_rate;
      if (!acc[rate]) {
        acc[rate] = 0;
      }
      acc[rate] += item.vat_amount;
      return acc;
    }, {} as { [key: number]: number });

    return {
      subtotalHT: Math.round(subtotalHT * 100) / 100,
      totalVAT: Math.round(totalVAT * 100) / 100,
      total: Math.round(total * 100) / 100,
      vatByRate,
    };
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Le nom du client est requis';
    }

    if (!formData.invoice_date) {
      newErrors.invoice_date = 'La date de facture est requise';
    }

    if (lineItems.length === 0 || lineItems.every(item => !item.product_name.trim())) {
      newErrors.line_items = 'Au moins un article est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const totals = calculateTotals();
      let invoiceNumber = invoice?.invoice_number;

      // Generate invoice number for new invoices
      if (!invoice) {
        invoiceNumber = await generateInvoiceNumber();
        if (!invoiceNumber) {
          setErrors({ general: 'Erreur lors de la génération du numéro de facture' });
          return;
        }
      }

      const invoiceData = {
        ...formData,
        invoice_number: invoiceNumber,
        order_id: importOrderId || invoice?.order_id || null,
        subtotal_amount: totals.subtotalHT,
        tax_amount: totals.totalVAT,
        total_amount: totals.total,
        updated_at: new Date().toISOString(),
      };

      let invoiceId = invoice?.id;

      if (invoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);

        if (error) {
          setErrors({ general: 'Erreur lors de la mise à jour de la facture' });
          return;
        }
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (error) {
          setErrors({ general: 'Erreur lors de la création de la facture' });
          return;
        }

        invoiceId = data.id;
      }

      // Save line items
      if (invoiceId) {
        // Delete existing line items
        await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceId);

        // Insert new line items
        const validLineItems = lineItems
          .filter(item => item.product_name.trim())
          .map(item => ({
            invoice_id: invoiceId,
            product_name: item.product_name,
            product_sku: item.product_sku,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            vat_rate: item.vat_rate,
            vat_amount: item.vat_amount,
          }));

        if (validLineItems.length > 0) {
          const { error: lineItemsError } = await supabase
            .from('invoice_line_items')
            .insert(validLineItems);

          if (lineItemsError) {
            console.error('Error saving line items:', lineItemsError);
          }
        }
      }

      onSubmit();
    } catch (err) {
      setErrors({ general: 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate when quantity, unit_price, or vat_rate changes
    if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      const vatRate = field === 'vat_rate' ? Number(value) : updatedItems[index].vat_rate;

      updatedItems[index].total_price = quantity * unitPrice;
      updatedItems[index].vat_amount = Math.round((updatedItems[index].total_price * vatRate / 100) * 100) / 100;
    }

    setLineItems(updatedItems);

    if (errors.line_items) {
      setErrors(prev => ({ ...prev, line_items: '' }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product_name: '',
      product_sku: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      vat_rate: 20.00,
      vat_amount: 0,
    }]);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems.length > 0 ? updatedItems : [{
      product_name: '',
      product_sku: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      vat_rate: 20.00,
      vat_amount: 0,
    }]);
  };

  const selectSearchResult = (item: any, lineItemIndex: number) => {
    handleLineItemChange(lineItemIndex, 'product_name', item.product_name);
    handleLineItemChange(lineItemIndex, 'product_sku', item.product_sku || '');
    handleLineItemChange(lineItemIndex, 'description', item.product_name);
    handleLineItemChange(lineItemIndex, 'unit_price', item.price || 0);
    handleLineItemChange(lineItemIndex, 'vat_rate', item.vat_rate || 20.00);
    
    // Calculate totals
    const totalPrice = (item.price || 0) * lineItems[lineItemIndex].quantity;
    const vatAmount = Math.round((totalPrice * (item.vat_rate || 20.00) / 100) * 100) / 100;
    
    handleLineItemChange(lineItemIndex, 'total_price', totalPrice);
    handleLineItemChange(lineItemIndex, 'vat_amount', vatAmount);
    
    setShowSearch(false);
    setItemSearch('');
    setSearchResults([]);
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux factures</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </h1>
          <p className="text-gray-600">
            {invoice ? 'Modifiez les informations de la facture' : 'Créez une nouvelle facture'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700">{errors.general}</span>
            </div>
          )}

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du client *
                </label>
                <input
                  type="text"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent ${
                    errors.customer_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.customer_name && (
                  <div className="flex items-center space-x-1 mt-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">{errors.customer_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="customer_email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la facture</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de facture *
                </label>
                <input
                  type="date"
                  id="invoice_date"
                  value={formData.invoice_date}
                  onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent ${
                    errors.invoice_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.invoice_date && (
                  <div className="flex items-center space-x-1 mt-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">{errors.invoice_date}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                >
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="paid">Payée</option>
                  <option value="overdue">En retard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Articles</h3>
              <div className="flex space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un article..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent w-64"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {searchResults.map((item, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                          onClick={() => selectSearchResult(item, lineItems.length - 1)}
                        >
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-500">
                            {item.product_sku && `SKU: ${item.product_sku} • `}
                            Prix: {item.price?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH HT • 
                            TVA: {item.calculated_vat_rate ? 
                              `${item.calculated_vat_rate.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%` : 
                              `${item.vat_rate || 20}%`
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {errors.line_items && (
              <div className="flex items-center space-x-1 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">{errors.line_items}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Qté</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">TVA %</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900">TVA</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={item.product_sku}
                          onChange={(e) => handleLineItemChange(index, 'product_sku', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#21522f] focus:border-transparent"
                          placeholder="SKU"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => handleLineItemChange(index, 'product_name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#21522f] focus:border-transparent"
                          placeholder="Nom de l'article"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#21522f] focus:border-transparent text-center"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#21522f] focus:border-transparent text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                        {item.total_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <select
                          value={item.vat_rate}
                          onChange={(e) => handleLineItemChange(index, 'vat_rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#21522f] focus:border-transparent text-center"
                        >
                          <option value={0}>0%</option>
                          <option value={5.5}>5.5%</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                        {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200"
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="border-t border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Sous-total HT:</span>
                  <span className="font-medium text-gray-900">
                    {totals.subtotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
                {Object.entries(totals.vatByRate).map(([rate, amount]) => (
                  <div key={rate} className="flex justify-between items-center">
                    <span className="text-gray-700">TVA {rate}%:</span>
                    <span className="font-medium text-gray-900">
                      {amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                    <span className="text-xl font-bold text-[#21522f]">
                      {totals.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              placeholder="Notes ou commentaires..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;