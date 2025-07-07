import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Package } from 'lucide-react';
import ClientSelector from './ClientSelector';

interface DeliveryNoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
}

interface DeliveryNote {
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  notes: string;
  line_items: DeliveryNoteLineItem[];
}

interface DeliveryNoteFormPageProps {
  onBack: () => void;
  preFilledData?: any;
  onClientSelect?: (client: any) => void;
}

const DeliveryNoteFormPage: React.FC<DeliveryNoteFormPageProps> = ({ onBack, preFilledData, onClientSelect }) => {
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote>({
    invoice_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
    line_items: [],
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Initialize with pre-filled data if provided
  useEffect(() => {
    if (preFilledData) {
      setDeliveryNote(preFilledData);
      // Create a mock client object from the pre-filled data
      if (preFilledData.customer_name) {
        const mockClient = {
          id: 'mock',
          first_name: preFilledData.customer_name.split(' ')[0] || '',
          last_name: preFilledData.customer_name.split(' ').slice(1).join(' ') || '',
          email: preFilledData.customer_email || '',
          phone: preFilledData.customer_phone || '',
          company_name: '',
          ice: '',
          address_line1: preFilledData.customer_address || '',
        };
        setSelectedClient(mockClient);
      }
    }
  }, [preFilledData]);

  // Handle client selection from ClientSelector
  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    if (client) {
      // Auto-fill delivery note fields with client data
      setDeliveryNote(prev => ({
        ...prev,
        customer_name: `${client.first_name} ${client.last_name}`.trim(),
        customer_email: client.email || '',
        customer_phone: client.phone || '',
        customer_address: client.address_line1 || '',
      }));
      
      // Call parent callback if provided
      if (onClientSelect) {
        onClientSelect(client);
      }
    } else {
      // Clear delivery note fields when no client is selected
      setDeliveryNote(prev => ({
        ...prev,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
      }));
      
      if (onClientSelect) {
        onClientSelect(null);
      }
    }
  };

  const updateLineItemQuantity = (itemId: string, quantity: number) => {
    setDeliveryNote(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity,
          };
        }
        return item;
      }),
    }));
  };

  const removeLineItem = (itemId: string) => {
    setDeliveryNote(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    }));
  };

  const saveDeliveryNote = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!deliveryNote.customer_name.trim()) {
        setError('Le nom du client est requis');
        return;
      }

      if (deliveryNote.line_items.length === 0) {
        setError('Au moins un article est requis');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-delivery-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryNote),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde du bon de livraison');
        return;
      }

      setSuccess(`Bon de livraison ${result.delivery_note.delivery_note_number} créé avec succès`);
      
      // Reset form after successful save
      setTimeout(() => {
        setDeliveryNote({
          invoice_id: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          delivery_date: new Date().toISOString().split('T')[0],
          notes: '',
          line_items: [],
        });
        setSuccess('');
        onBack(); // Go back to delivery note list
      }, 2000);

    } catch (err) {
      setError('Erreur lors de la sauvegarde du bon de livraison');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Livraison</h1>
            <p className="text-gray-600">Créer un nouveau bon de livraison</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={saveDeliveryNote}
            disabled={saving || deliveryNote.line_items.length === 0 || !deliveryNote.customer_name.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
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

      {/* Client Selector - only show if no pre-filled data */}
      {!preFilledData && (
        <ClientSelector
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          title="Informations Client"
        />
      )}

      {/* Pre-filled client info display */}
      {preFilledData && selectedClient && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Nom complet</p>
                <p className="text-gray-900 font-medium">{deliveryNote.customer_name}</p>
              </div>
              
              {deliveryNote.customer_email && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900">{deliveryNote.customer_email}</p>
                </div>
              )}
              
              {deliveryNote.customer_phone && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Téléphone</p>
                  <p className="text-gray-900">{deliveryNote.customer_phone}</p>
                </div>
              )}
              
              {deliveryNote.customer_address && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Adresse</p>
                  <p className="text-gray-900">{deliveryNote.customer_address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Delivery Note Fields */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails du bon de livraison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de livraison
            </label>
            <input
              type="date"
              value={deliveryNote.delivery_date}
              onChange={(e) => setDeliveryNote(prev => ({ ...prev, delivery_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles à livrer</h2>
          
          {deliveryNote.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantité</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNote.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Aucun article ajouté au bon de livraison</p>
              <p className="text-sm">Les articles seront automatiquement ajoutés depuis la facture</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={deliveryNote.notes}
          onChange={(e) => setDeliveryNote(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Notes additionnelles pour le bon de livraison..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default DeliveryNoteFormPage;