import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus, Eye, Edit, FileText, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DocumentFilters from './DocumentFilters';

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  status: string;
  notes: string;
  invoiced: boolean;
  invoice_id: string | null;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryNoteListPageProps {
  onCreateNew: () => void;
  onViewDeliveryNote: (deliveryNoteId: string) => void;
  onEditDeliveryNote: (deliveryNoteId: string) => void;
  onGenerateInvoice?: (invoiceData: any) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

const DeliveryNoteListPage: React.FC<DeliveryNoteListPageProps> = ({
  onCreateNew,
  onViewDeliveryNote,
  onEditDeliveryNote,
  onGenerateInvoice,
  onViewInvoice,
}) => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDeliveryNotes, setSelectedDeliveryNotes] = useState<string[]>([]);

  useEffect(() => {
    fetchDeliveryNotes();
  }, [searchTerm, selectedClient, dateFrom, dateTo, selectedStatus]);

  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('delivery_notes')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.ilike('delivery_note_number', `%${searchTerm}%`);
      }

      if (selectedClient) {
        query = query.eq('customer_name', selectedClient);
      }

      if (dateFrom) {
        query = query.gte('delivery_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('delivery_date', dateTo);
      }

      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des bons de livraison');
        return;
      }

      setDeliveryNotes(data || []);
    } catch (err) {
      setError('Erreur lors du chargement des bons de livraison');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    if (onViewInvoice) {
      onViewInvoice(invoiceId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'invoiced':
        return 'bg-blue-100 text-blue-800';
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
      case 'invoiced':
        return 'Facturé';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handleCheckboxChange = (deliveryNoteId: string, checked: boolean) => {
    if (checked) {
      setSelectedDeliveryNotes(prev => [...prev, deliveryNoteId]);
    } else {
      setSelectedDeliveryNotes(prev => prev.filter(id => id !== deliveryNoteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const nonInvoicedIds = deliveryNotes
        .filter(dn => !dn.invoiced)
        .map(dn => dn.id);
      setSelectedDeliveryNotes(nonInvoicedIds);
    } else {
      setSelectedDeliveryNotes([]);
    }
  };

  const handleGenerateInvoiceFromSelected = async () => {
    if (selectedDeliveryNotes.length === 0) {
      setError('Veuillez sélectionner au moins un bon de livraison');
      return;
    }

    try {
      setError('');
      setSuccess('');

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

      setSuccess(result.message);
      setSelectedDeliveryNotes([]);
      fetchDeliveryNotes(); // Refresh the list

      // Navigate to the generated invoice if callback is provided
      if (onGenerateInvoice && result.invoice) {
        onGenerateInvoice(result.invoice);
      }

    } catch (err) {
      setError('Erreur lors de la génération de la facture');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatus('');
  };

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'delivered', label: 'Livré' },
    { value: 'cancelled', label: 'Annulé' },
    { value: 'invoiced', label: 'Facturé' },
  ];

  const eligibleForInvoicing = deliveryNotes.filter(dn => !dn.invoiced);
  const allEligibleSelected = eligibleForInvoicing.length > 0 && 
    eligibleForInvoicing.every(dn => selectedDeliveryNotes.includes(dn.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de Livraison</h1>
          <p className="text-gray-600">Gestion des bons de livraison</p>
        </div>
        <div className="flex space-x-3">
          {selectedDeliveryNotes.length > 0 && (
            <button
              onClick={handleGenerateInvoiceFromSelected}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <FileText className="w-4 h-4" />
              <span>Générer Facture ({selectedDeliveryNotes.length})</span>
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Bon</span>
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

      {/* Filters */}
      <DocumentFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par numéro de bon..."
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        clientTableName="delivery_notes"
        clientFieldName="customer_name"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateFieldLabel="Date de livraison"
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statusOptions={statusOptions}
        onClearFilters={clearFilters}
      />

      {/* Delivery Notes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={eligibleForInvoicing.length === 0}
                    className="rounded border-gray-300 text-[#21522f] focus:ring-[#21522f]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Bon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total TTC
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
                    Aucun bon de livraison trouvé
                  </td>
                </tr>
              ) : (
                deliveryNotes.map((deliveryNote) => (
                  <tr key={deliveryNote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedDeliveryNotes.includes(deliveryNote.id)}
                        onChange={(e) => handleCheckboxChange(deliveryNote.id, e.target.checked)}
                        disabled={deliveryNote.invoiced}
                        className="rounded border-gray-300 text-[#21522f] focus:ring-[#21522f] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deliveryNote.delivery_note_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(deliveryNote.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{deliveryNote.customer_name}</div>
                        <div className="text-sm text-gray-500">{deliveryNote.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deliveryNote.status)}`}>
                        {getStatusText(deliveryNote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deliveryNote.total_ttc.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} DH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewDeliveryNote(deliveryNote.id)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                          title="Voir le bon de livraison"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {deliveryNote.status === 'pending' && (
                          <button
                            onClick={() => onEditDeliveryNote(deliveryNote.id)}
                            className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                            title="Modifier le bon de livraison"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {deliveryNote.invoiced && deliveryNote.invoice_id && (
                          <button
                            onClick={() => handleViewInvoice(deliveryNote.invoice_id!)}
                            className="text-green-600 hover:text-green-900 transition-colors duration-200"
                            title="Voir la facture associée"
                          >
                            <Receipt className="w-4 h-4" />
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
      </div>
    </div>
  );
};

export default DeliveryNoteListPage;