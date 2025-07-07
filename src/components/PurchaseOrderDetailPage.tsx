import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Save, CheckCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PurchaseOrderLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
}

interface PurchaseOrderDetail {
  id: string;
  purchase_order_number: string;
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  order_date: string;
  expected_date: string | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: PurchaseOrderLineItem[];
}

interface PurchaseOrderDetailPageProps {
  purchaseOrderId: string;
  onBack: () => void;
}

const PurchaseOrderDetailPage: React.FC<PurchaseOrderDetailPageProps> = ({ purchaseOrderId, onBack }) => {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [validating, setValidating] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchPurchaseOrderDetail();
  }, [purchaseOrderId]);

  const fetchPurchaseOrderDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get purchase order details
      const { data: purchaseOrderData, error: purchaseOrderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', purchaseOrderId)
        .single();

      if (purchaseOrderError) {
        setError('Bon de commande non trouvé');
        return;
      }

      // Get line items for the purchase order
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('purchase_order_line_items')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      const orderWithItems = {
        ...purchaseOrderData,
        line_items: lineItems || []
      };

      setPurchaseOrder(orderWithItems);
      setNewStatus(purchaseOrderData.status);
      
      // Initialize received quantities with current values
      const quantities: {[key: string]: number} = {};
      (lineItems || []).forEach(item => {
        quantities[item.id] = item.quantity_received || 0;
      });
      setReceivedQuantities(quantities);
    } catch (err) {
      setError('Erreur lors du chargement du bon de commande');
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
      case 'completed':
        return 'Terminé';
      case 'partial':
        return 'Partiellement reçu';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusSave = async () => {
    if (!purchaseOrder || newStatus === purchaseOrder.status) {
      setEditingStatus(false);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrderId);

      if (updateError) {
        setError('Erreur lors de la mise à jour du statut');
        return;
      }

      setPurchaseOrder(prev => prev ? { ...prev, status: newStatus } : null);
      setEditingStatus(false);
      setSuccess('Statut mis à jour avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusCancel = () => {
    setNewStatus(purchaseOrder?.status || '');
    setEditingStatus(false);
  };

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceivedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity)
    }));
  };

  const validateAndUpdateInventory = async () => {
    if (!purchaseOrder) return;

    try {
      setValidating(true);
      setError('');
      setSuccess('');

      // Prepare received items data
      const receivedItems = Object.entries(receivedQuantities).map(([itemId, quantityReceived]) => ({
        id: itemId,
        quantity_received: quantityReceived,
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-purchase-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_order_id: purchaseOrderId,
          received_items: receivedItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la validation');
        return;
      }

      setSuccess(`Bon de commande validé avec succès. ${result.stock_update_count || 0} produit(s) mis à jour dans l'inventaire.`);
      
      // Refresh the purchase order data
      await fetchPurchaseOrderDetail();

    } catch (err) {
      setError('Erreur lors de la validation du bon de commande');
    } finally {
      setValidating(false);
    }
  };

  const hasChanges = () => {
    if (!purchaseOrder) return false;
    return purchaseOrder.line_items.some(item => 
      receivedQuantities[item.id] !== item.quantity_received
    );
  };

  // Check if order is already completed to prevent re-validation
  const isCompleted = () => {
    if (!purchaseOrder) return false;
    return purchaseOrder.status === 'completed';
  };

  // Check if order is already completed to prevent re-validation
  const isCompleted = () => {
    if (!purchaseOrder) return false;
    return purchaseOrder.status === 'completed';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du bon de commande...</p>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
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
          <p className="text-red-700">{error || 'Bon de commande non trouvé'}</p>
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
          {hasChanges() && !isCompleted() && (
            <button
              onClick={validateAndUpdateInventory}
              disabled={validating}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{validating ? 'Validation...' : 'Valider Réception'}</span>
            </button>
          )}
          {hasChanges() && isCompleted() && (
            <div className="flex items-center bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200">
              <span className="text-sm">Le bon de commande est déjà terminé</span>
            </div>
          )}
          {hasChanges() && isCompleted() && (
            <div className="flex items-center bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200">
              <span className="text-sm">Le bon de commande est déjà terminé</span>
            </div>
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

      {/* Purchase Order Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BON DE COMMANDE</h1>
              <p className="text-lg font-semibold text-gray-700">{purchaseOrder.purchase_order_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(purchaseOrder.order_date)}</p>
              {purchaseOrder.expected_date && (
                <p className="text-sm text-gray-600">Livraison prévue: {formatDate(purchaseOrder.expected_date)}</p>
              )}
              <div className="mt-2">
                {editingStatus ? (
                  <div className="flex items-center space-x-2 print:hidden">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    >
                      <option value="pending">En attente</option>
                      <option value="partial">Partiellement reçu</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchaseOrder.status)}`}>
                      {getStatusText(purchaseOrder.status)}
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

        {/* Supplier Information */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fournisseur:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{purchaseOrder.supplier_name}</p>
                {purchaseOrder.supplier_email && <p>{purchaseOrder.supplier_email}</p>}
                {purchaseOrder.supplier_phone && <p>{purchaseOrder.supplier_phone}</p>}
                {purchaseOrder.supplier_address && (
                  <p className="mt-2 whitespace-pre-line">{purchaseOrder.supplier_address}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Détails de la commande:</h3>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">Numéro:</span> {purchaseOrder.purchase_order_number}</p>
                <p><span className="font-medium">Date de commande:</span> {formatDate(purchaseOrder.order_date)}</p>
                {purchaseOrder.expected_date && (
                  <p><span className="font-medium">Livraison prévue:</span> {formatDate(purchaseOrder.expected_date)}</p>
                )}
                <p><span className="font-medium">Statut:</span> <span className="capitalize">{getStatusText(purchaseOrder.status)}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles commandés</h3>
          {purchaseOrder.line_items && purchaseOrder.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Qté Commandée</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 print:hidden">Qté Reçue</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 hidden print:table-cell">Qté Reçue</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity_ordered}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center print:hidden">
                        <input
                          type="number"
                          value={receivedQuantities[item.id] || 0}
                          onChange={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value) || 0)}
                          min="0"
                          max={item.quantity_ordered}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900 hidden print:table-cell">
                        {item.quantity_received}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Aucun article trouvé pour ce bon de commande</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {purchaseOrder.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{purchaseOrder.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Merci pour votre collaboration!</p>
          <p className="mt-2">Gepronet - Gestion Professionnelle</p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;