import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Save, Edit, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeliveryNoteLineItem {
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

interface DeliveryNoteDetail {
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
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  line_items: DeliveryNoteLineItem[];
}

interface DeliveryNoteDetailPageProps {
  deliveryNoteId: string;
  onBack: () => void;
}

const DeliveryNoteDetailPage: React.FC<DeliveryNoteDetailPageProps> = ({ deliveryNoteId, onBack }) => {
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [clientInfo, setClientInfo] = useState<{company_name: string} | null>(null);

  useEffect(() => {
    fetchDeliveryNoteDetail();
  }, [deliveryNoteId]);

  const fetchClientInfo = async (customerEmail: string, customerName: string) => {
    if (!customerEmail && !customerName) return;

    try {
      let query = supabase.from('clients').select('company_name, first_name, last_name');
      
      if (customerEmail) {
        query = query.eq('email', customerEmail);
      } else {
        // Try to match by name parts
        const nameParts = customerName.split(' ');
        if (nameParts.length >= 2) {
          query = query
            .eq('first_name', nameParts[0])
            .eq('last_name', nameParts.slice(1).join(' '));
        }
      }
      
      const { data: clientData } = await query.single();
      
      if (clientData) {
        setClientInfo(clientData);
      }
    } catch (err) {
      // Client not found or error - will use delivery note customer_name as fallback
      console.log('Client not found in database');
    }
  };
  const fetchDeliveryNoteDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get delivery note details
      const { data: deliveryNoteData, error: deliveryNoteError } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', deliveryNoteId)
        .single();

      if (deliveryNoteError) {
        setError('Bon de livraison non trouvé');
        return;
      }

      // Get line items for the delivery note
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('delivery_note_line_items')
        .select('*')
        .eq('delivery_note_id', deliveryNoteId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setDeliveryNote({
        ...deliveryNoteData,
        line_items: lineItems || []
      });
      setNewStatus(deliveryNoteData.status);
      
      // Fetch client info to get company name
      await fetchClientInfo(deliveryNoteData.customer_email, deliveryNoteData.customer_name);
    } catch (err) {
      setError('Erreur lors du chargement du bon de livraison');
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
      case 'pending':
        return 'En attente';
      case 'delivered':
        return 'Livré';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusSave = async (selectedStatus?: string) => {
    const statusToUpdate = selectedStatus || newStatus;
    
    if (!deliveryNote || statusToUpdate === deliveryNote.status) {
      setEditingStatus(false);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Handle WooCommerce inventory updates based on status changes
      let inventoryUpdated = false;
      let inventoryOperation = null;
      
      if (statusToUpdate === 'delivered' && deliveryNote.status !== 'delivered') {
        // Reduce inventory when delivering
        inventoryOperation = 'reduce';
      } else if (statusToUpdate === 'cancelled' && deliveryNote.status === 'delivered') {
        // Restore inventory when cancelling a delivered order
        inventoryOperation = 'restore';
      }
      
      if (inventoryOperation) {
        try {
          const inventoryResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-delivery-note-inventory`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              delivery_note_id: deliveryNoteId,
              operation: inventoryOperation
            }),
          });

          if (inventoryResponse.ok) {
            inventoryUpdated = true;
          }
        } catch (inventoryError) {
          console.error('Inventory update error:', inventoryError);
          // Don't fail the status update if inventory update fails
        }
      }
      
      const { error: updateError } = await supabase
        .from('delivery_notes')
        .update({ 
          status: statusToUpdate,
          updated_at: new Date().toISOString(),
          inventory_updated: inventoryOperation ? inventoryUpdated : deliveryNote.inventory_updated,
        })
        .eq('id', deliveryNoteId);

      if (updateError) {
        setError('Erreur lors de la mise à jour du statut');
        return;
      }

      setDeliveryNote(prev => prev ? { ...prev, status: statusToUpdate } : null);
      setEditingStatus(false);
      
      let successMessage = 'Statut mis à jour avec succès';
      if (inventoryOperation === 'reduce' && inventoryUpdated) {
        successMessage += ' et inventaire WooCommerce réduit';
      } else if (inventoryOperation === 'reduce' && !inventoryUpdated) {
        successMessage += ' (attention: inventaire WooCommerce non réduit)';
      } else if (inventoryOperation === 'restore' && inventoryUpdated) {
        successMessage += ' et inventaire WooCommerce restauré';
      } else if (inventoryOperation === 'restore' && !inventoryUpdated) {
        successMessage += ' (attention: inventaire WooCommerce non restauré)';
      }
      setSuccess(successMessage);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setSaving(false);
      setShowStatusDropdown(false);
    }
  };

  const handleStatusCancel = () => {
    setNewStatus(deliveryNote?.status || '');
    setEditingStatus(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du bon de livraison...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryNote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Bon de livraison non trouvé'}</p>
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
          <span>Retour</span>
        </button>
        <div className="flex space-x-3">
          {/* Edit Button - only show for pending delivery notes */}
          {deliveryNote.status === 'pending' && !deliveryNote.invoiced && (
            <button
              onClick={() => window.location.href = `#edit-${deliveryNote.id}`}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
          
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
                getStatusColor(deliveryNote.status).replace('bg-', 'bg-opacity-20 border-').replace('text-', 'text-')
              } hover:bg-opacity-30`}
            >
              <span className="font-medium">{getStatusText(deliveryNote.status)}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {[
                    { value: 'pending', label: 'En attente', color: 'text-yellow-700' },
                    { value: 'delivered', label: 'Livré', color: 'text-green-700' },
                    { value: 'cancelled', label: 'Annulé', color: 'text-red-700' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setShowStatusDropdown(false);
                        handleStatusSave(option.value);
                      }}
                      disabled={saving}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-200 ${
                        deliveryNote.status === option.value ? 'bg-gray-50' : ''
                      } disabled:opacity-50`}
                    >
                      <span className={`${option.color} font-medium`}>
                        {option.label}
                      </span>
                      {deliveryNote.status === option.value && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showStatusDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowStatusDropdown(false)}
        />
      )}
      {/* Delivery Note Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BON DE LIVRAISON</h1>
              <p className="text-lg font-semibold text-gray-700">{deliveryNote.delivery_note_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(deliveryNote.delivery_date)}</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Livré à:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">
                {clientInfo?.company_name || deliveryNote.customer_name || 'Nom de l\'entreprise'}
              </p>
              {deliveryNote.customer_address && (
                <p className="mt-1 whitespace-pre-line">{deliveryNote.customer_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          {deliveryNote.line_items && deliveryNote.line_items.length > 0 ? (
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
                  {deliveryNote.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                        {item.vat_percentage || 0}%
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.vat_amount?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} DH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour ce bon de livraison
            </div>
          )}
        </div>

        {/* Totals */}
        {deliveryNote.line_items && deliveryNote.line_items.length > 0 && (
          <div className="flex justify-end">
            <div className="w-80">
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Sous-total HT:</span>
                  <span className="font-medium text-gray-900">
                    {(deliveryNote.subtotal_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">TVA:</span>
                  <span className="font-medium text-gray-900">
                    {(deliveryNote.total_vat || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                    <span className="text-xl font-bold text-[#21522f]">
                      {(deliveryNote.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {deliveryNote.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{deliveryNote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryNoteDetailPage;