import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Edit, Calendar, User, Mail, Phone, MapPin } from 'lucide-react';
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
  id: string;
  product_name: string;
  product_sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceDetailProps {
  invoiceId: string;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack, onEdit }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        setError('Erreur lors du chargement de la facture');
        return;
      }

      setInvoice(invoiceData);

      // Fetch line items
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setLineItems(lineItemsData || []);
    } catch (err) {
      setError('Erreur lors du chargement de la facture');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'sent':
        return 'Envoyée';
      case 'overdue':
        return 'En retard';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux factures</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Facture non trouvée'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux factures</span>
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => onEdit(invoice)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Edit className="w-4 h-4" />
            <span>Modifier</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Invoice Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">FACTURE</h1>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-gray-700">#{invoice.invoice_number}</p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <div className="flex items-center justify-end space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Date: {formatDate(invoice.invoice_date)}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex items-center justify-end space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Échéance: {formatDate(invoice.due_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Facturé à:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{invoice.customer_name}</span>
              </div>
              {invoice.customer_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{invoice.customer_email}</span>
                </div>
              )}
              {invoice.customer_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{invoice.customer_phone}</span>
                </div>
              )}
              {invoice.customer_address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <span className="text-gray-600">{invoice.customer_address}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expédié par:</h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Gepronet</p>
              <p className="text-gray-600">Gestion Professionnelle</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles</h3>
          {lineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantité</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit.</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.description || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour cette facture
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Sous-total HT:</span>
                <span className="font-medium text-gray-900">
                  {invoice.subtotal_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">TVA ({invoice.tax_percentage}%):</span>
                <span className="font-medium text-gray-900">
                  {invoice.tax_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total TTC:</span>
                  <span className="text-xl font-bold text-[#21522f]">
                    {invoice.total_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Merci pour votre confiance!</p>
          <p className="mt-2">Gepronet - Gestion Professionnelle</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;