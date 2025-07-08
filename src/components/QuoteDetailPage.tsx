import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Calendar, FileText, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: number;
  vat_amount: number;
}

interface QuoteDetail {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  quote_date: string;
  valid_until_date: string | null;
  status: string;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: QuoteLineItem[];
}

interface QuoteDetailPageProps {
  quoteId: string;
  onBack: () => void;
  onEditQuote?: (quoteId: string) => void;
}

const QuoteDetailPage: React.FC<QuoteDetailPageProps> = ({ quoteId, onBack, onEditQuote }) => {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchQuoteDetail();
  }, [quoteId]);

  const fetchQuoteDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get quote details
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        setError('Devis non trouvé');
        return;
      }

      // Get line items for the quote
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setQuote({
        ...quoteData,
        line_items: lineItems || []
      });
      setNewStatus(quoteData.status);
    } catch (err) {
      setError('Erreur lors du chargement du devis');
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepté';
      case 'sent':
        return 'Envoyé';
      case 'expired':
        return 'Expiré';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusSave = async () => {
    if (!quote || newStatus === quote.status) {
      setEditingStatus(false);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) {
        console.error('Quote status update error:', updateError);
        setError(`Erreur lors de la mise à jour du statut: ${updateError.message}`);
        return;
      }

      setQuote(prev => prev ? { ...prev, status: newStatus } : null);
      setEditingStatus(false);
      setSuccess('Statut mis à jour avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Quote status update error:', err);
      setError(`Erreur lors de la mise à jour du statut: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusCancel = () => {
    setNewStatus(quote?.status || '');
    setEditingStatus(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux devis</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Devis non trouvé'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 print:hidden">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 print:hidden">
          {success}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux devis</span>
        </button>
        <div className="flex space-x-3">
          {onEditQuote && (
            <button
              onClick={() => onEditQuote(quoteId)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Quote Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Quote Header */}
        <div className="pb-3 mb-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="w-64 text-center text-sm leading-tight mb-4">
                <div className="font-bold text-lg text-gray-900">GETRADIS</div>
                <div className="font-semibold text-gray-800">Magasin Gepronet</div>
                <div className="text-gray-700 mt-1">111, Avenue Mohamed Belhassan</div>
                <div className="text-gray-700">Elouazani - RABAT</div>
                <div className="text-gray-700 mt-1">Patente : 25903587 - R. C. : 29149</div>
                <div className="text-gray-700">I. F. : 03315202</div>
                <div className="text-gray-700 mt-1">Tél : 0537654006</div>
                <div className="text-gray-700">Fax: 0537756864</div>
                <div className="text-gray-700">e-mail : contact@gepronet.com</div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">DEVIS</h1>
              <p className="text-lg font-semibold text-gray-700">{quote.quote_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(quote.quote_date)}</p>
              {quote.valid_until_date && (
                <p className="text-sm text-gray-600">Valable jusqu'au: {formatDate(quote.valid_until_date)}</p>
              )}
              <div className="mt-2">
                {editingStatus ? (
                  <div className="flex items-center space-x-2 print:hidden">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="sent">Envoyé</option>
                      <option value="accepted">Accepté</option>
                      <option value="expired">Expiré</option>
                    </select>
                    <button
                      onClick={handleStatusSave}
                      disabled={saving}
                      className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{saving ? '...' : 'OK'}</span>
                    </button>
                    <button
                      onClick={handleStatusCancel}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                      {getStatusText(quote.status)}
                    </span>
                    <button
                      onClick={() => setEditingStatus(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 print:hidden"
                    >
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Client:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">{quote.customer_name}</p>
              {quote.customer_address && (
                <p className="mt-1 whitespace-pre-line">{quote.customer_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          {quote.line_items && quote.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      <span className="print:hidden">Quantité</span>
                      <span className="hidden print:inline">Qte</span>
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">TVA %</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.line_items.map((item, index) => (
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
                        {item.vat_percentage}%
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
              Aucun article trouvé pour ce devis
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Sous-total HT:</span>
                <span className="font-medium text-gray-900">
                  {quote.subtotal_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">TVA:</span>
                <span className="font-medium text-gray-900">
                  {quote.total_vat.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="border-t border-gray-300 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                  <span className="text-xl font-bold text-[#21522f]">
                    {quote.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}

        {/* Terms */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Conditions:</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Ce devis est valable {quote.valid_until_date ? `jusqu'au ${formatDate(quote.valid_until_date)}` : '30 jours'}</p>
            <p>• Les prix sont exprimés en dirhams (DH) toutes taxes comprises</p>
            <p>• Paiement à 30 jours net</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPage;