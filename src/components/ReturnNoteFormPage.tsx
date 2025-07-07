import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Package, Minus, Plus } from 'lucide-react';

interface ReturnNoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_returned: number;
  max_quantity: number;
  unit_price_ht: number;
  total_ht: number;
}

interface ReturnNote {
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  return_date: string;
  reason: string;
  notes: string;
  line_items: ReturnNoteLineItem[];
}

interface ReturnNoteFormPageProps {
  onBack: () => void;
  preFilledData?: any;
}

const ReturnNoteFormPage: React.FC<ReturnNoteFormPageProps> = ({ onBack, preFilledData }) => {
  const [returnNote, setReturnNote] = useState<ReturnNote>({
    invoice_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    return_date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    line_items: [],
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize with pre-filled data if provided
  useEffect(() => {
    if (preFilledData) {
      setReturnNote(preFilledData);
    }
  }, [preFilledData]);

  const updateLineItemQuantity = (itemId: string, quantity: number) => {
    setReturnNote(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          const validQuantity = Math.max(0, Math.min(quantity, item.max_quantity));
          return {
            ...item,
            quantity_returned: validQuantity,
            total_ht: item.unit_price_ht * validQuantity,
          };
        }
        return item;
      }),
    }));
  };

  const removeLineItem = (itemId: string) => {
    setReturnNote(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    }));
  };

  const addItemBack = (itemId: string) => {
    const originalItem = preFilledData?.line_items?.find((item: any) => item.id === itemId);
    if (originalItem) {
      setReturnNote(prev => ({
        ...prev,
        line_items: [...prev.line_items, { ...originalItem, quantity_returned: 1 }],
      }));
    }
  };

  const calculateTotals = () => {
    const totalRefund = returnNote.line_items.reduce((sum, item) => sum + item.total_ht, 0);
    return { totalRefund };
  };

  const saveReturnNote = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!returnNote.customer_name.trim()) {
        setError('Le nom du client est requis');
        return;
      }

      if (returnNote.line_items.length === 0) {
        setError('Au moins un article à retourner est requis');
        return;
      }

      if (!returnNote.reason.trim()) {
        setError('Le motif de retour est requis');
        return;
      }

      // Filter out items with 0 quantity
      const filteredLineItems = returnNote.line_items.filter(item => item.quantity_returned > 0);
      
      if (filteredLineItems.length === 0) {
        setError('Au moins un article avec une quantité supérieure à 0 est requis');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-return-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...returnNote,
          line_items: filteredLineItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde du bon de retour');
        return;
      }

      setSuccess(`Bon de retour ${result.return_note.return_note_number} créé avec succès. Stock mis à jour.`);
      
      // Reset form after successful save
      setTimeout(() => {
        setReturnNote({
          invoice_id: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          return_date: new Date().toISOString().split('T')[0],
          reason: '',
          notes: '',
          line_items: [],
        });
        setSuccess('');
        onBack(); // Go back to return note list
      }, 3000);

    } catch (err) {
      setError('Erreur lors de la sauvegarde du bon de retour');
    } finally {
      setSaving(false);
    }
  };

  const { totalRefund } = calculateTotals();

  // Get available items that can be added back
  const availableItems = preFilledData?.line_items?.filter((item: any) => 
    !returnNote.line_items.find(returnItem => returnItem.id === item.id)
  ) || [];

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
            <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Retour</h1>
            <p className="text-gray-600">Créer un nouveau bon de retour</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={saveReturnNote}
            disabled={saving || returnNote.line_items.length === 0 || !returnNote.customer_name.trim() || !returnNote.reason.trim()}
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

      {/* Customer Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nom complet</p>
              <p className="text-gray-900 font-medium">{returnNote.customer_name}</p>
            </div>
            
            {returnNote.customer_email && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                <p className="text-gray-900">{returnNote.customer_email}</p>
              </div>
            )}
            
            {returnNote.customer_phone && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Téléphone</p>
                <p className="text-gray-900">{returnNote.customer_phone}</p>
              </div>
            )}
            
            {returnNote.customer_address && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-1">Adresse</p>
                <p className="text-gray-900">{returnNote.customer_address}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails du retour</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de retour
            </label>
            <input
              type="date"
              value={returnNote.return_date}
              onChange={(e) => setReturnNote(prev => ({ ...prev, return_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif de retour *
            </label>
            <select
              value={returnNote.reason}
              onChange={(e) => setReturnNote(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            >
              <option value="">Sélectionner un motif</option>
              <option value="Produit défectueux">Produit défectueux</option>
              <option value="Produit endommagé">Produit endommagé</option>
              <option value="Erreur de commande">Erreur de commande</option>
              <option value="Client insatisfait">Client insatisfait</option>
              <option value="Problème de qualité">Problème de qualité</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Articles à retourner</h2>
            {availableItems.length > 0 && (
              <div className="text-sm text-gray-600">
                {availableItems.length} article(s) disponible(s) pour retour
              </div>
            )}
          </div>
          
          {returnNote.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Qté à retourner</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returnNote.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => updateLineItemQuantity(item.id, item.quantity_returned - 1)}
                            disabled={item.quantity_returned <= 0}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity_returned}</span>
                          <button
                            onClick={() => updateLineItemQuantity(item.id, item.quantity_returned + 1)}
                            disabled={item.quantity_returned >= item.max_quantity}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Max: {item.max_quantity}</div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
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
              <p>Aucun article sélectionné pour retour</p>
              <p className="text-sm">Sélectionnez les articles de la facture à retourner</p>
            </div>
          )}

          {/* Available Items to Add */}
          {availableItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">Articles disponibles pour retour</h3>
              <div className="grid grid-cols-1 gap-2">
                {availableItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                      {item.product_sku && (
                        <span className="text-sm text-gray-500 ml-2">({item.product_sku})</span>
                      )}
                      <div className="text-xs text-gray-600">Quantité facturée: {item.max_quantity}</div>
                    </div>
                    <button
                      onClick={() => addItemBack(item.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        {returnNote.line_items.length > 0 && (
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-80">
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">TOTAL À REMBOURSER:</span>
                    <span className="text-xl font-bold text-red-600">
                      {totalRefund.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={returnNote.notes}
          onChange={(e) => setReturnNote(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Notes additionnelles pour le bon de retour..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default ReturnNoteFormPage;