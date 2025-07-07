import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight, Download, Globe, CreditCard, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OrderDetailPage from './OrderDetailPage';

interface Order {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  order_status: string;
  total_amount: number;
  payment_method: string;
  shipping_address: string;
  billing_address: string;
  order_source: string;
  order_date: string;
  created_at: string;
  updated_at: string;
  onGenerateInvoice?: (orderData: any) => void;
}

const VentesPage: React.FC<VentesPageProps> = ({ onGenerateInvoice }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Order>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const ordersPerPage = 20;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, sortField, sortDirection, searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('wc_orders')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * ordersPerPage;
      const to = from + ordersPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des commandes');
        return;
      }

      setOrders(data || []);
      setTotalPages(Math.ceil((count || 0) / ordersPerPage));
    } catch (err) {
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
    try {
      setSyncing(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-sync-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la synchronisation');
        return;
      }

      setSuccess(result.message);
      fetchOrders();
    } catch (err) {
      setError('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: keyof Order) => {
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'processing':
        return 'En cours';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
  };

  const handleGenerateInvoice = async (order: Order) => {
    try {
      setError('');
      
      // Fetch order details including line items
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-order-detail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: order.order_id }),
      });

      const orderDetail = await response.json();

      if (!response.ok) {
        setError('Erreur lors du chargement des détails de la commande');
        return;
      }

      // Transform order data to invoice format
      const invoiceData = {
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: '',
        customer_address: order.billing_address || order.shipping_address || '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: `Facture générée à partir de la commande #${order.order_number}`,
        line_items: (orderDetail.line_items || []).map((item: any, index: number) => {
          // Apply the same display logic as the order view for consistency
          const getTaxPercentageDisplay = (taxClass: string) => {
            // Only convert "exonerer" to "0%", keep everything else as-is
            if (!taxClass || taxClass.toLowerCase().includes('exonerer')) {
              return '0%';
            }
            
            // Return the tax class exactly as it comes from WooCommerce
            return taxClass;
          };
          
          // Convert tax class to numeric percentage for database storage
          const getTaxPercentageNumeric = (taxClass: string): number => {
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
          
          const displayedTaxClass = getTaxPercentageDisplay(item.tax_class || '');
          const numericVatPercentage = getTaxPercentageNumeric(item.tax_class || '');
          
          // Use subtotal as HT price (WooCommerce subtotal is before tax)
          const totalHT = item.subtotal;
          const unitPriceHT = totalHT / item.quantity;
          const vatAmount = item.tax_total;

          return {
            id: `order-${order.order_id}-${index}`,
            product_id: item.product_id,
            product_sku: item.product_sku || '',
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_ht: unitPriceHT,
            total_ht: totalHT,
            vat_percentage: numericVatPercentage, // Use numeric value for database
            vat_amount: vatAmount,
          };
        }),
      };

      // Call the parent function to navigate to invoice form with pre-filled data
      if (onGenerateInvoice) {
        onGenerateInvoice(invoiceData);
      }

    } catch (err) {
      setError('Erreur lors de la génération de la facture');
    }
  };

  // If an order is selected, show the detail view
  if (selectedOrderId) {
    return (
      <OrderDetailPage 
        orderId={selectedOrderId} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
          <p className="text-gray-600">Gestion des commandes WooCommerce</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={syncOrders}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronisation...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par nom de client ou numéro de commande..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_number')}
                >
                  N° Commande
                  {sortField === 'order_number' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_date')}
                >
                  Date
                  {sortField === 'order_date' && (
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
                  onClick={() => handleSort('order_status')}
                >
                  Statut
                  {sortField === 'order_status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_amount')}
                >
                  Total (DH)
                  {sortField === 'total_amount' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode de paiement
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr 
                    key={order.order_id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => handleOrderClick(order.order_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        {order.order_source === 'pos' ? (
                          <CreditCard className="w-4 h-4 text-orange-600" title="Point de Vente" />
                        ) : (
                          <Globe className="w-4 h-4 text-blue-600" title="Site Web" />
                        )}
                        <span>#{order.order_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.order_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.order_status)}`}>
                        {getStatusText(order.order_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.total_amount.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} DH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateInvoice(order);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                        title="Générer une facture"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="text-xs">Facture</span>
                      </button>
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

export default VentesPage;