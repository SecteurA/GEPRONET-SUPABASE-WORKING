import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight, Plus, Eye, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Quote {
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
}

interface QuoteListPageProps {
  onCreateNew: () => void;
  onViewQuote: (quoteId: string) => void;
  onGenerateInvoice?: (quote: Quote) => void;
}

const QuoteListPage: React.FC<QuoteListPageProps> = ({ onCreateNew, onViewQuote, onGenerateInvoice }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Quote>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  const quotesPerPage = 20;

  useEffect(() => {
    fetchQuotes();
  }, [currentPage, sortField, sortDirection, searchTerm]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('quotes')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,quote_number.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * quotesPerPage;
      const to = from + quotesPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des devis');
        return;
      }

      setQuotes(data || []);
      setTotalPages(Math.ceil((count || 0) / quotesPerPage));
    } catch (err) {
      setError('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Quote) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  const handleGenerateInvoice = async (quote: Quote) => {
    try {
      // Fetch quote details including line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error loading quote line items:', lineItemsError);
        return;
      }

      // Transform quote data to invoice format
      const invoiceData = {
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        customer_address: quote.customer_address,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: `Facture générée à partir du devis ${quote.quote_number}`,
        line_items: (lineItems || []).map((item: any) => ({
          id: `quote-${item.id}`,
          product_id: item.product_id,
          product_sku: item.product_sku || '',
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht,
          total_ht: item.total_ht,
          vat_percentage: item.vat_percentage,
          vat_amount: item.vat_amount,
        })),
      };

      // Call parent callback if provided
      if (onGenerateInvoice) {
        onGenerateInvoice(invoiceData);
      }

    } catch (err) {
      console.error('Error preparing invoice data:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          <p className="text-gray-600">Gestion des devis</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Devis</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par numéro, nom de client ou email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quote_number')}
                >
                  N° Devis
                  {sortField === 'quote_number' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quote_date')}
                >
                  Date
                  {sortField === 'quote_date' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('customer_name')}
                >
                  Client
                  {sortField === 'customer_name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('valid_until_date')}
                >
                  Valable jusqu'au
                  {sortField === 'valid_until_date' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Statut
                  {sortField === 'status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_ttc')}
                >
                  Total TTC (DH)
                  {sortField === 'total_ttc' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p>Aucun devis trouvé</p>
                      <p className="text-sm">Créez votre premier devis pour commencer</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr 
                    key={quote.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => onViewQuote(quote.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.quote_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.quote_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{quote.customer_name}</div>
                        {quote.customer_email && (
                          <div className="text-sm text-gray-500">{quote.customer_email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quote.valid_until_date ? formatDate(quote.valid_until_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                        {getStatusText(quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.total_ttc.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} DH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewQuote(quote.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                          title="Voir le devis"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateInvoice(quote);
                          }}
                          className="text-green-600 hover:text-green-900 transition-colors duration-200"
                          title="Générer une facture"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteListPage;