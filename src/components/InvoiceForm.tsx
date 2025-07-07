import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Calendar } from 'lucide-react';
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
  tax_percentage: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceLineItem {
  id?: string;
  product_name: string;
  product_sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  vat_amount: number;
}

interface InvoiceFormProps {
  invoice: Invoice | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    tax_percentage: 20,
    notes: '',
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  useEffect(() => {
    if (invoice) {
      // If editing, populate form with existing data
      setFormData({
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        customer_phone: invoice.customer_phone,
        customer_address: invoice.customer_address,
        invoice_date: invoice.invoice_date.split('T')[0],
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        status: invoice.status,
        tax_percentage: invoice.tax_percentage,
        notes: invoice.notes,
      });
      
      // Fetch existing line items if editing
      fetchLineItems(invoice.id);
    } else {
      // If creating new, add one empty line item
      setLineItems([{
        product_name: '',
        product_sku: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        vat_rate: 20,
        vat_amount: 0,
      }]);
    }
  }, [invoice]);

  const fetchLineItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching line items:', error);
        return;
      }

      setLineItems(data || []);
    } catch (err) {
      console.error('Error fetching line items:', err);
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      // Get invoice settings
      const { data: settings, error: settingsError } = await supabase
        .from('invoice_settings')
        .select('*')
        .single();

      if (settingsError) {
        // If no settings exist, create default ones
        const currentYear = new Date().getFullYear();
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
          throw createError;
        }
        return `${newSettings.prefix}${newSettings.year}-${String(newSettings.current_number).padStart(4, '0')}`;
      }

      const currentYear = new Date().getFullYear();
      let { prefix, year, current_number } = settings;

      // Reset counter if year changed
      if (year !== currentYear) {
        year = currentYear;
        current_number = 1;
      }

      const invoiceNumber = `${prefix}${year}-${String(current_number).padStart(4, '0')}`;

      // Update settings
      await supabase
        .from('invoice_settings')
        .update({
          year,
          current_number: current_number + 1,
        })
        .eq('id', settings.id);

      return invoiceNumber;
    } catch (err) {
      console.error('Error generating invoice number:', err);
      return `FA${new Date().getFullYear()}-0001`;
    }
  };

  const calculateLineItem = (item: InvoiceLineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const vatAmount = (subtotal * item.vat_rate) / 100;
    const total = subtotal + vatAmount;

    return {
      ...item,
      total_price: subtotal,
      vat_amount: vatAmount,
    };
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate totals for this line item
    updatedItems[index] = calculateLineItem(updatedItems[index]);

    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product_name: '',
      product_sku: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      vat_rate: formData.tax_percentage,
      vat_amount: 0,
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      let invoiceData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        status: formData.status,
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        tax_percentage: formData.tax_percentage,
        notes: formData.notes,
      };

      let invoiceId: string;

      if (invoice) {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);

        if (updateError) {
          throw updateError;
        }

        invoiceId = invoice.id;

        // Delete existing line items
        await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoice.id);
      } else {
        // Create new invoice
        const invoiceNumber = await generateInvoiceNumber();
        
        const { data: newInvoice, error: createError } = await supabase
          .from('invoices')
          .insert({
            ...invoiceData,
            invoice_number: invoiceNumber,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        invoiceId = newInvoice.id;
      }

      // Insert line items
      const lineItemsData = lineItems
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

      if (lineItemsData.length > 0) {
        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsData);

        if (lineItemsError) {
          throw lineItemsError;
        }
      }

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </h1>
          <p className="text-gray-600">
            {invoice ? `Facture ${invoice.invoice_number}` : 'Créer une nouvelle facture'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations client</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du client *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <textarea
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la facture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de facture *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  required
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'échéance
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Articles</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un article</span>
            </button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du produit *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.product_name}
                      onChange={(e) => updateLineItem(index, 'product_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix unitaire (DH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TVA (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.vat_rate}
                      onChange={(e) => updateLineItem(index, 'vat_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="w-full px-3 py-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                  />
                </div>
                <div className="mt-2 text-right text-sm text-gray-600">
                  Total HT: {(item.quantity * item.unit_price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  {' | '}
                  TVA: {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Sous-total HT:</span>
                  <span className="font-medium">{subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">TVA:</span>
                  <span className="font-medium">{taxAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total TTC:</span>
                    <span className="text-xl font-bold text-[#21522f]">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Notes ou conditions particulières..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;