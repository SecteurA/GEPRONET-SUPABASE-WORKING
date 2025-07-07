import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvoiceLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: string | number; // Can be tax class string or numeric percentage
  vat_amount: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
}

interface InvoiceDetailPageProps {
  invoiceId: string;
  onBack: () => void;
}

const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({ invoiceId, onBack }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        setError('Facture non trouvée');
        return;
      }

      // Get line items for the invoice
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setInvoice({
        ...invoiceData,
        line_items: lineItems || []
      });
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
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
              <img 
                src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/gepronet/gepronet.png" 
                alt="Gepronet Logo" 
                className="w-48 h-auto mb-4"
              />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">FACTURE</h1>
              <p className="text-lg font-semibold text-gray-700">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(invoice.invoice_date)}</p>
              {invoice.due_date && (
                <p className="text-sm text-gray-600">Échéance: {formatDate(invoice.due_date)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Facturé à:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{invoice.customer_name}</p>
                {invoice.customer_email && <p>{invoice.customer_email}</p>}
                {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
                {invoice.customer_address && (
                  <p className="mt-2 whitespace-pre-line">{invoice.customer_address}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Détails de la facture:</h3>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">Numéro:</span> {invoice.invoice_number}</p>
                <p><span className="font-medium">Date d'émission:</span> {formatDate(invoice.invoice_date)}</p>
                {invoice.due_date && (
                  <p><span className="font-medium">Date d'échéance:</span> {formatDate(invoice.due_date)}</p>
                )}
                <p><span className="font-medium">Statut:</span> <span className="capitalize">{invoice.status}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles</h3>
          {invoice.line_items && invoice.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantité</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">TVA %</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                        {typeof item.vat_percentage === 'string' ? item.vat_percentage : `${item.vat_percentage}%`}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
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
                  {invoice.subtotal_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">TVA:</span>
                <span className="font-medium text-gray-900">
                  {invoice.total_vat.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                  <span className="text-xl font-bold text-[#21522f]">
                    {invoice.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
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

export default InvoiceDetailPage;