import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Plus, Eye, Edit, FileText, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DocumentFilters from './DocumentFilters';

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  invoiced?: boolean;
  subtotal_ht?: number;
  total_vat?: number;
  total_ttc?: number;
}

interface DeliveryNoteListPageProps {
  onCreateNew: () => void;
  onViewDeliveryNote: (deliveryNoteId: string) => void;
  onEditDeliveryNote?: (deliveryNoteId: string) => void;
  onGenerateInvoice?: (deliveryNoteData: any) => void;
}

const DeliveryNoteListPage: React.FC<DeliveryNoteListPageProps> = ({ onCreateNew, onViewDeliveryNote, onEditDeliveryNote, onGenerateInvoice }) => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof DeliveryNote>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [selectedDeliveryNotes, setSelectedDeliveryNotes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  
  // Filter states
  const [selectedClient, setSelectedClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const deliveryNotesPerPage = 20;

  useEffect(() => {
    fetchDeliveryNotes();
  }, [currentPage, sortField, sortDirection, searchTerm, selectedClient, dateFrom, dateTo, selectedStatus]);

  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('delivery_notes')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,delivery_note_number.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }
      
      // Apply client filter
      if (selectedClient) {
        query = query.eq('customer_name', selectedClient);
      }
      
      // Apply date filters
      if (dateFrom) {
        query = query.gte('delivery_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('delivery_date', dateTo);
      }
      
      // Apply status filter
      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * deliveryNotesPerPage;
      const to = from + deliveryNotesPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des bons de livraison');
        return;
      }

      setDeliveryNotes(data || []);
      setTotalPages(Math.ceil((count || 0) / deliveryNotesPerPage));
    } catch (err) {
      setError('Erreur lors du chargement des bons de livraison');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof DeliveryNote) => {
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
      case 'delivered':
        return 'bg-green-100 text-green-800';
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
      case 'delivered':
        return 'Livré';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const handleSelectDeliveryNote = (deliveryNoteId: string, checked: boolean) => {
    if (checked) {
      setSelectedDeliveryNotes(prev => [...prev, deliveryNoteId]);
    } else {
      setSelectedDeliveryNotes(prev => prev.filter(id => id !== deliveryNoteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select non-invoiced delivery notes
      const selectableIds = deliveryNotes
        .filter(dn => !dn.invoiced)
        .map(dn => dn.id);
      setSelectedDeliveryNotes(selectableIds);
    } else {
      setSelectedDeliveryNotes([]);
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedDeliveryNotes.length === 0) {
      setError('Veuillez sélectionner au moins un bon de livraison');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invoice-from-delivery-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_note_ids: selectedDeliveryNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la génération de la facture');
        return;
      }

      // Transform the response for the invoice form
      const invoiceData = {
        customer_name: result.invoice.customer_name,
        customer_email: result.invoice.customer_email,
        customer_phone: result.invoice.customer_phone,
        customer_address: result.invoice.customer_address,
        invoice_date: result.invoice.invoice_date,
        due_date: '',
        notes: result.invoice.notes,
        line_items: result.invoice.line_items.map((item: any) => ({
          id: item.id || `dn-${item.product_id}-${Date.now()}`,
          product_id: item.product_id,
          product_sku: item.product_sku || '',
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_ht: parseFloat(item.unit_price_ht || 0),
          total_ht: parseFloat(item.total_ht || 0),
          vat_percentage: parseFloat(item.vat_percentage || 0),
          vat_amount: parseFloat(item.vat_amount || 0),
        })),
        delivery_note_numbers: result.invoice.delivery_note_numbers,
      };

      // Call parent callback to navigate to invoice form
      if (onGenerateInvoice) {
        onGenerateInvoice(invoiceData);
      }

      // Refresh the list to show updated statuses
      fetchDeliveryNotes();
      setSelectedDeliveryNotes([]);

    } catch (err) {
      setError('Erreur lors de la génération de la facture');
    } finally {
      setGenerating(false);
    }
  };

  const isDeliveryNoteSelectable = (deliveryNote: DeliveryNote) => {
    return !deliveryNote.invoiced && deliveryNote.status !== 'cancelled';
  };

  const selectedCustomers = selectedDeliveryNotes.length > 0 
    ? [...new Set(deliveryNotes
        .filter(dn => selectedDeliveryNotes.includes(dn.id))
        .map(dn => dn.customer_name))]
    : [];

  const canGenerateInvoice = selectedDeliveryNotes.length > 0 && selectedCustomers.length === 1;

  // Status options for the filter
  const statusOptions = [
    { value: 'pending', label: 'En attente', color: 'yellow' },
    { value: 'delivered', label: 'Livré', color: 'green' },
    { value: 'cancelled', label: 'Annulé', color: 'red' },
    { value: 'invoiced', label: 'Facturé', color: 'blue' },
  ];

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de Livraison</h1>
          <p className="text-gray-600">Gestion des bons de livraison</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Bon de Livraison</span>
          </button>
          {selectedDeliveryNotes.length > 0 && (
            <button
              onClick={handleGenerateInvoice}
              disabled={!canGenerateInvoice || generating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Receipt className="w-4 h-4" />
              <span>{generating ? 'Génération...' : `Générer Facture (${selectedDeliveryNotes.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Selection Info */}
      {selectedDeliveryNotes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">
                {selectedDeliveryNotes.length} bon(s) de livraison sélectionné(s)
              </p>
              {selectedCustomers.length > 1 && (
                <p className="text-blue-600 text-sm">
                  ⚠️ Attention: Les bons sélectionnés appartiennent à différents clients. 
                  Une facture ne peut être générée que pour un seul client.
                </p>
              )}
              {selectedCustomers.length === 1 && (
                <p className="text-blue-600 text-sm">
                  Client: {selectedCustomers[0]}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDeliveryNotes([])}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Désélectionner tout
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <DocumentFilters
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
        searchPlaceholder="Rechercher par numéro, nom de client ou email..."
        selectedClient={selectedClient}
        onClientChange={(client) => {
          setSelectedClient(client);
          setCurrentPage(1);
        }}
        clientTableName="delivery_notes"
        clientFieldName="customer_name"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(date) => {
          setDateFrom(date);
          setCurrentPage(1);
        }}
        onDateToChange={(date) => {
          setDateTo(date);
          setCurrentPage(1);
        }}
        dateFieldLabel="Date de livraison"
        selectedStatus={selectedStatus}
        onStatusChange={(status) => {
          setSelectedStatus(status);
          setCurrentPage(1);
        }}
        statusOptions={statusOptions}
        onClearFilters={handleClearFilters}
      />

      {/* Delivery Notes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedDeliveryNotes.length > 0 && selectedDeliveryNotes.length === deliveryNotes.filter(dn => isDeliveryNoteSelectable(dn)).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-[#21522f] focus:ring-[#21522f]"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('delivery_note_number')}
                >
                  N° Bon de Livraison
                  {sortField === 'delivery_note_number' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('delivery_date')}
                >
                  Date
                  {sortField === 'delivery_date' && (
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
              ) : deliveryNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p>Aucun bon de livraison trouvé</p>
                      <p className="text-sm">Les bons de livraison seront créés à partir des factures</p>
                    </div>
                  </td>
                </tr>
              ) : (
                deliveryNotes.map((deliveryNote) => (
                  <tr 
                    key={deliveryNote.id} 
                    className={`hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                      deliveryNote.invoiced ? 'bg-gray-50 opacity-75' : ''
                    }`}
                    onClick={() => onViewDeliveryNote(deliveryNote.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isDeliveryNoteSelectable(deliveryNote) ? (
                        <input
                          type="checkbox"
                          checked={selectedDeliveryNotes.includes(deliveryNote.id)}
                         onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectDeliveryNote(deliveryNote.id, e.target.checked);
                          }}
                          className="rounded border-gray-300 text-[#21522f] focus:ring-[#21522f]"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{deliveryNote.delivery_note_number}</span>
                        {deliveryNote.invoiced && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Facturé
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(deliveryNote.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{deliveryNote.customer_name}</div>
                        {deliveryNote.customer_email && (
                          <div className="text-sm text-gray-500">{deliveryNote.customer_email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        deliveryNote.invoiced ? 'bg-green-100 text-green-800' : getStatusColor(deliveryNote.status)
                      }`}>
                        {deliveryNote.invoiced ? 'Facturé' : getStatusText(deliveryNote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deliveryNote.total_ttc 
                        ? deliveryNote.total_ttc.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) + ' DH'
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDeliveryNote(deliveryNote.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                          title="Voir le bon de livraison"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Edit button - only show for pending delivery notes that are not invoiced */}
                        {deliveryNote.status === 'pending' && !deliveryNote.invoiced && onEditDeliveryNote && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDeliveryNote(deliveryNote.id);
                            }}
                            className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                            title="Modifier le bon de livraison"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
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

export default DeliveryNoteListPage;